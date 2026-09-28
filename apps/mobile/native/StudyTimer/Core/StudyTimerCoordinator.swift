import Foundation

actor StudyTimerCoordinator {
  private let store: any StudyTimerStoring
  private let activities: any StudyActivityManaging
  private let now: @Sendable () -> Double
  private var commandInProgress = false
  private var waitingCommands: [CheckedContinuation<Void, Never>] = []

  private struct Reconciled {
    let result: StudyTimerResult
    let cleanupConfirmed: Bool
  }

  init(
    store: any StudyTimerStoring, activities: any StudyActivityManaging,
    now: @escaping @Sendable () -> Double = { Date().timeIntervalSince1970 * 1_000 }
  ) {
    self.store = store
    self.activities = activities
    self.now = now
  }

  func execute(_ command: StudyTimerCommand) async throws -> StudyTimerResult {
    await acquireCommandSlot()
    defer { releaseCommandSlot() }
    switch command {
    case .getSession:
      return try await reconcile(try await load()).result
    case .start(let input):
      let name = input.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !name.isEmpty && name.count <= 80 else { throw StudyTimerError.invalidName }
      let stored = try await load()
      if case .session = stored { throw StudyTimerError.sessionConflict }
      let reconciled = try await reconcile(stored)
      let session = StudySession.start(name: name, nowMs: now())
      try await save(session)
      if !reconciled.cleanupConfirmed {
        return await result(session, warning: .cleanupUnconfirmed)
      }
      return await request(session, warning: reconciled.result.warning)
    case .pause(let id):
      let session = try await matchingSession(id)
      return try await transition(session, to: session.paused(at: now()))
    case .resume(let id):
      let session = try await matchingSession(id)
      return try await transition(session, to: session.resumed(at: now()))
    case .stop(let id):
      let stored = try await load()
      if case .session(let session) = stored, session.sessionId != id {
        throw StudyTimerError.staleSession
      }
      if case .invalid = stored { return try await reconcile(stored).result }
      try await delete()
      let confirmed = await endActivities(except: nil)
      return StudyTimerResult(
        session: nil, activityStatus: nil, warning: confirmed ? nil : .cleanupUnconfirmed)
    case .retryActivity(let id):
      let session = try await matchingSession(id)
      let reconciled = try await reconcile(.session(session))
      if reconciled.result.activityStatus == .active || !reconciled.cleanupConfirmed {
        return reconciled.result
      }
      return await request(session)
    }
  }

  // The slot stays owned across every await; actor isolation alone would permit interleaving.
  private func acquireCommandSlot() async {
    if commandInProgress {
      await withCheckedContinuation { waitingCommands.append($0) }
    } else {
      commandInProgress = true
    }
  }

  private func releaseCommandSlot() {
    if waitingCommands.isEmpty {
      commandInProgress = false
    } else {
      waitingCommands.removeFirst().resume()
    }
  }

  private func load() async throws -> StudyStoreRead {
    do { return try await store.load() } catch { throw StudyTimerError.persistenceFailed }
  }

  private func save(_ session: StudySession) async throws {
    do { try await store.save(session) } catch { throw StudyTimerError.persistenceFailed }
  }

  private func delete() async throws {
    do { try await store.delete() } catch { throw StudyTimerError.persistenceFailed }
  }

  private func matchingSession(_ id: String) async throws -> StudySession {
    guard case .session(let session) = try await load(), session.sessionId == id else {
      throw StudyTimerError.staleSession
    }
    return session
  }

  private func reconcile(_ stored: StudyStoreRead) async throws -> Reconciled {
    switch stored {
    case .invalid:
      let confirmed = await endActivities(except: nil)
      try await delete()
      return Reconciled(
        result: StudyTimerResult(
          session: nil, activityStatus: nil,
          warning: confirmed ? .sessionDiscarded : .cleanupUnconfirmed), cleanupConfirmed: confirmed
      )
    case .missing:
      let confirmed = await endActivities(except: nil)
      return Reconciled(
        result: StudyTimerResult(
          session: nil, activityStatus: nil, warning: confirmed ? nil : .cleanupUnconfirmed),
        cleanupConfirmed: confirmed)
    case .session(let session):
      let matches = await activities.activities().filter {
        $0.state.isNonterminal && $0.sessionId == session.sessionId
      }
      let adopted = matches.first
      let confirmed = await endActivities(except: adopted?.id)
      if let adopted { await activities.update(id: adopted.id, session: session) }
      return Reconciled(
        result: await result(session, warning: confirmed ? nil : .cleanupUnconfirmed),
        cleanupConfirmed: confirmed)
    }
  }

  private func endActivities(except survivorId: String?) async -> Bool {
    for activity in await activities.activities()
    where activity.state.isNonterminal && activity.id != survivorId {
      await activities.end(id: activity.id)
    }
    return await activities.activities().allSatisfy {
      !$0.state.isNonterminal || $0.id == survivorId
    }
  }

  private func transition(_ current: StudySession, to next: StudySession) async throws
    -> StudyTimerResult
  {
    if current != next { try await save(next) }
    for activity in await activities.activities()
    where activity.state.isNonterminal && activity.sessionId == next.sessionId {
      await activities.update(id: activity.id, session: next)
    }
    return await result(next)
  }

  private func request(_ session: StudySession, warning: StudyTimerWarning? = nil) async
    -> StudyTimerResult
  {
    guard await activities.activitiesEnabled() else {
      return await result(session, warning: .activityUnavailable)
    }
    do {
      try await activities.request(session)
      return await result(session, warning: warning)
    } catch {
      return await result(session, warning: .activityUnavailable, requestFailed: true)
    }
  }

  private func result(
    _ session: StudySession, warning: StudyTimerWarning? = nil, requestFailed: Bool = false
  ) async -> StudyTimerResult {
    let active = await activities.activities().contains {
      $0.state.isNonterminal && $0.sessionId == session.sessionId
    }
    let enabled = await activities.activitiesEnabled()
    let status: StudyActivityStatus =
      active ? .active : (enabled && !requestFailed ? .missing : .unavailable)
    let defaultWarning: StudyTimerWarning? =
      switch status {
      case .active: nil
      case .missing: .activityMissing
      case .unavailable: .activityUnavailable
      }
    return StudyTimerResult(
      session: session, activityStatus: status, warning: warning ?? defaultWarning)
  }
}
