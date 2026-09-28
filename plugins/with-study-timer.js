const { withInfoPlist, withXcodeProject } = require("expo/config-plugins");

const targetName = "StudyTimerWidget";
const sharedPath = "../native/Shared/StudyTimerAttributes.swift";
const widgetPath = "../widgets/study-timer/StudyTimerWidget.swift";

function unquote(value) {
  return typeof value === "string" ? value.replace(/^"|"$/g, "") : value;
}

function addSource(project, targetId, path) {
  const objects = project.hash.project.objects;
  const target = objects.PBXNativeTarget[targetId];
  let phase = target.buildPhases
    .map(({ value }) => objects.PBXSourcesBuildPhase?.[value])
    .find(Boolean);
  if (!phase)
    phase = project.addBuildPhase(
      [],
      "PBXSourcesBuildPhase",
      "Sources",
      targetId,
    ).buildPhase;

  const references = objects.PBXFileReference;
  let referenceId = Object.keys(references).find(
    (key) => unquote(references[key]?.path) === path,
  );
  if (!referenceId) {
    referenceId = project.generateUuid();
    references[referenceId] = {
      isa: "PBXFileReference",
      lastKnownFileType: "sourcecode.swift",
      path: `"${path}"`,
      sourceTree: "SOURCE_ROOT",
    };
    references[`${referenceId}_comment`] = path.split("/").pop();
    const group =
      objects.PBXGroup[project.getFirstProject().firstProject.mainGroup];
    group.children.push({ value: referenceId, comment: path.split("/").pop() });
  }
  if (
    phase.files.some(
      ({ value }) => objects.PBXBuildFile[value]?.fileRef === referenceId,
    )
  )
    return;
  const buildId = project.generateUuid();
  const comment = `${path.split("/").pop()} in Sources`;
  objects.PBXBuildFile[buildId] = {
    isa: "PBXBuildFile",
    fileRef: referenceId,
    fileRef_comment: path.split("/").pop(),
  };
  objects.PBXBuildFile[`${buildId}_comment`] = comment;
  phase.files.push({ value: buildId, comment });
}

module.exports = function withStudyTimer(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults.NSSupportsLiveActivities = true;
    return config;
  });
  return withXcodeProject(config, (config) => {
    if (!config.ios?.bundleIdentifier)
      throw new Error("Study Timer requires ios.bundleIdentifier.");
    const project = config.modResults;
    const objects = project.hash.project.objects;
    const app = project.getFirstTarget();
    let widgetId = Object.keys(objects.PBXNativeTarget).find(
      (key) => unquote(objects.PBXNativeTarget[key]?.name) === targetName,
    );
    if (!widgetId) {
      objects.PBXTargetDependency ??= {};
      objects.PBXContainerItemProxy ??= {};
      widgetId = project.addTarget(
        targetName,
        "app_extension",
        targetName,
        `${config.ios.bundleIdentifier}.${targetName}`,
      ).uuid;
      project.addBuildPhase(
        [],
        "PBXFrameworksBuildPhase",
        "Frameworks",
        widgetId,
      );
      project.addBuildPhase(
        [],
        "PBXResourcesBuildPhase",
        "Resources",
        widgetId,
      );
    }
    const widget = objects.PBXNativeTarget[widgetId];
    const configurationList =
      objects.XCConfigurationList[widget.buildConfigurationList];
    for (const { value } of configurationList.buildConfigurations) {
      Object.assign(objects.XCBuildConfiguration[value].buildSettings, {
        APPLICATION_EXTENSION_API_ONLY: "YES",
        CODE_SIGN_STYLE: "Automatic",
        CURRENT_PROJECT_VERSION: `"${config.ios.buildNumber ?? "1"}"`,
        GENERATE_INFOPLIST_FILE: "NO",
        INFOPLIST_FILE: '"../widgets/study-timer/Info.plist"',
        IPHONEOS_DEPLOYMENT_TARGET: "16.4",
        MARKETING_VERSION: `"${config.version ?? "1.0.0"}"`,
        PRODUCT_BUNDLE_IDENTIFIER: `"${config.ios.bundleIdentifier}.${targetName}"`,
        SDKROOT: "iphoneos",
        SKIP_INSTALL: "YES",
        SWIFT_VERSION: "5.0",
        TARGETED_DEVICE_FAMILY: '"1,2"',
      });
      if (config.ios.appleTeamId)
        objects.XCBuildConfiguration[value].buildSettings.DEVELOPMENT_TEAM =
          config.ios.appleTeamId;
    }
    addSource(project, app.uuid, sharedPath);
    addSource(project, widgetId, sharedPath);
    addSource(project, widgetId, widgetPath);
    return config;
  });
};
