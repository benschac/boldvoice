# Project working agreement

Preserve unrelated user changes. Keep edits scoped to the requested task.

## Formatting and verification

File writes by agents do not trigger editor format-on-save. Run `bun run format`
after editing project files and before committing or running `gt modify`. Run
`bun run format:check`, `bun run lint`, and `bun run typecheck` before declaring
work complete. Format each affected Graphite branch before amending it, then
restack its descendants.

Prettier formats JavaScript, TypeScript, JSON, Markdown, and YAML. Swift uses
`xcrun swift-format` from Xcode. Generated native projects, build outputs, lockfiles,
and installed skills under `.agents/` are excluded from Prettier formatting.

VS Code users should install the recommended workspace extensions for format on
save. Other editors and agents must use the same project formatting commands.
