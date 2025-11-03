---
name: Pull Request
about: Propose changes to OSA
title: ''
labels: ''
assignees: ''

---

## Description
<!-- Briefly describe what this PR does -->

## Type of Change
<!-- Check all that apply -->
- [ ] 🐛 Bug fix (patch)
- [ ] ✨ New feature (minor)
- [ ] 💥 Breaking change (major)
- [ ] 📚 Documentation update
- [ ] 🔒 Security fix
- [ ] 🔧 Maintenance/Refactoring

## Release Management
<!-- ⚠️ IMPORTANT: Add release labels to trigger automatic release on merge -->

**For automatic release on merge, add one of these labels:**
- `release:major` - Breaking changes, incompatible API changes (bumps 1.x.x → 2.0.0)
- `release:minor` - New features, backwards-compatible (bumps x.1.x → x.2.0)

**No label = No automatic release** (manual release via GitHub Actions later)

## Testing
<!-- Describe how you tested these changes -->
- [ ] Tested on macOS
- [ ] Tested on Linux
- [ ] Tested on WSL
- [ ] Ran `./osa-cli.zsh --scan-secrets` (if touching constructors)
- [ ] Ran tests: `./tests/run-tests.zsh`

## Checklist
- [ ] My code follows the zsh style of this project
- [ ] I have added `#!/usr/bin/env zsh` shebang to new scripts
- [ ] I have updated documentation (if applicable)
- [ ] No hardcoded secrets (use `osa-secret-set` instead)
- [ ] All files use `.zsh` extension (unless intentionally `.sh` for bash)
- [ ] I have added appropriate release label (`release:major` or `release:minor`)

## Additional Context
<!-- Add any other context about the PR here -->
