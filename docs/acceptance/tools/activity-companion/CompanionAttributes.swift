import ActivityKit
import Foundation

struct CompanionAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    let startedAt: Date
  }

  let name: String
}
