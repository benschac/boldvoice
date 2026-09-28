/* global __dirname */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const plugin = require("./with-study-timer");
const pluginRequire = createRequire(require.resolve("expo/config-plugins"));
const xcode = pluginRequire("xcode");

const unquote = (value) =>
  typeof value === "string" ? value.replace(/^"|"$/g, "") : value;
const mobileRoot = path.resolve(__dirname, "..");
const projectPath = path.resolve(
  process.argv[2] ??
    path.join(mobileRoot, "ios/mobile.xcodeproj/project.pbxproj"),
);
const before = fs.readFileSync(projectPath, "utf8");
const project = xcode.project(projectPath);
project.parseSync();
const config = require("../app.json").expo;

async function applyPlugin() {
  const configured = plugin({ ...config, mods: {} });
  await configured.mods.ios.xcodeproj({
    ...configured,
    modResults: project,
    modRequest: { projectRoot: mobileRoot },
  });
  const info = await configured.mods.ios.infoPlist({
    ...configured,
    modResults: {},
    modRequest: { projectRoot: mobileRoot },
  });
  assert.equal(info.modResults.NSSupportsLiveActivities, true);
}

function assertStructure() {
  const objects = project.hash.project.objects;
  const targets = Object.entries(objects.PBXNativeTarget).filter(
    ([, value]) => value.isa === "PBXNativeTarget",
  );
  const widgets = targets.filter(
    ([, value]) => unquote(value.name) === "StudyTimerWidget",
  );
  assert.equal(widgets.length, 1, "one widget extension target");
  const [widgetId, widget] = widgets[0];
  const app = project.getFirstTarget();
  assert.equal(
    unquote(widget.productType),
    "com.apple.product-type.app-extension",
  );
  assert.equal(
    app.firstTarget.dependencies.filter(
      ({ value }) => objects.PBXTargetDependency[value]?.target === widgetId,
    ).length,
    1,
    "app depends on widget exactly once",
  );
  const embedded = app.firstTarget.buildPhases.flatMap(
    ({ value }) => objects.PBXCopyFilesBuildPhase?.[value]?.files ?? [],
  );
  assert.equal(
    embedded.filter(
      ({ value }) =>
        objects.PBXBuildFile[value]?.fileRef === widget.productReference,
    ).length,
    1,
    "widget embedded exactly once",
  );

  const sourcePaths = (target) =>
    target.buildPhases
      .flatMap(
        ({ value }) => objects.PBXSourcesBuildPhase?.[value]?.files ?? [],
      )
      .map(({ value }) =>
        unquote(
          objects.PBXFileReference[objects.PBXBuildFile[value].fileRef].path,
        ),
      );
  const shared = "../native/Shared/StudyTimerAttributes.swift";
  assert.equal(
    sourcePaths(app.firstTarget).filter((value) => value === shared).length,
    1,
  );
  assert.deepEqual(
    sourcePaths(widget).sort(),
    [shared, "../widgets/study-timer/StudyTimerWidget.swift"].sort(),
  );
  for (const [, target] of targets) {
    assert.ok(
      sourcePaths(target).every(
        (value) => !/Tests\/|Package\.swift/.test(value),
      ),
      "test sources stay out of native targets",
    );
  }
  assert.deepEqual(config.experiments.inlineModules.watchedDirectories, [
    "native/StudyTimer",
  ]);
  const synchronizedGroups = Object.entries(
    objects.PBXFileSystemSynchronizedRootGroup ?? {},
  ).filter(([, value]) => value.isa === "PBXFileSystemSynchronizedRootGroup");
  assert.equal(
    synchronizedGroups.length,
    1,
    "exactly one synchronized native folder",
  );
  const [groupId, group] = synchronizedGroups[0];
  assert.equal(unquote(group.path), "../native/StudyTimer");
  assert.equal(unquote(group.sourceTree), "SOURCE_ROOT");
  for (const [targetId, target] of targets) {
    const memberships = (target.fileSystemSynchronizedGroups ?? []).map(
      (entry) => entry.value ?? entry,
    );
    assert.deepEqual(
      memberships,
      targetId === app.uuid ? [groupId] : [],
      "only the app compiles the inline native folder",
    );
  }
  const watchedRoot = path.join(mobileRoot, "native/StudyTimer");
  const watchedFiles = fs.readdirSync(watchedRoot, { recursive: true });
  assert.ok(
    watchedFiles.includes("StudyTimerModule.swift"),
    "watched folder contains the native bridge",
  );
  assert.ok(
    watchedFiles.every(
      (value) =>
        !/(^|[/\\])(?:Tests|Package\.swift)(?:[/\\]|$)|Tests\.swift$/.test(
          value,
        ),
    ),
    "watched tree contains neither host tests nor the package manifest",
  );
  for (const { value } of objects.XCConfigurationList[
    widget.buildConfigurationList
  ].buildConfigurations) {
    const settings = objects.XCBuildConfiguration[value].buildSettings;
    assert.equal(
      unquote(settings.PRODUCT_BUNDLE_IDENTIFIER),
      `${config.ios.bundleIdentifier}.StudyTimerWidget`,
    );
    assert.equal(
      unquote(settings.INFOPLIST_FILE),
      "../widgets/study-timer/Info.plist",
    );
    assert.equal(settings.APPLICATION_EXTENSION_API_ONLY, "YES");
  }
}

async function main() {
  assertStructure();
  await applyPlugin();
  assertStructure();
  const first = project.writeSync();
  await applyPlugin();
  assertStructure();
  assert.equal(
    project.writeSync(),
    first,
    "second plugin application leaves project byte-identical",
  );
  assert.equal(
    fs.readFileSync(projectPath, "utf8"),
    before,
    "verification never modifies the generated project",
  );
  console.log(
    "PASS: generated target, dependency, embedding, shared membership, app-only synchronized folder, test exclusion, settings, and repeated plugin application. Generated project unchanged.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
