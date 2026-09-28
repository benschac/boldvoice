// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "StudyTimerCore",
  platforms: [.macOS(.v13)],
  products: [.library(name: "StudyTimerCore", targets: ["StudyTimerCore"])],
  targets: [
    .target(name: "StudyTimerCore", path: "StudyTimer/Core"),
    .testTarget(
      name: "StudyTimerCoreTests", dependencies: ["StudyTimerCore"],
      path: "Tests/StudyTimerCoreTests"),
  ]
)
