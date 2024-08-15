# Roadmap

## v2.x.x

### Changes
- [ ] Rewrite code to Zig
- [ ] Size reduction

### Reimplemented commands
- [ ] UpdateToLatest
    - [ ] Download delta packages

### New features
- [ ] Install locally without Internet (full package install)
- [ ] Disable updates

## v1.x.x

### Reimplemented Features

- [x] New install
- [x] Update host
- [x] Update modules

### Reimplemented functions

- [x] command
- [x] command_blocking
- [x] known_folder
- [x] create_shortcut

### Reimplemented commands
- [x] UpdateToLatest
    - [x] Download full packages
    - [x] Install packages
    - [x] Update `installer.db` states
    - [x] Show task progress
    - [x] Return Manifest info when done

- [x] InstallModule
    - [x] Download packages
    - [x] Install packages
    - [x] Update `installer.db` states
    - [x] Show task progress
    - [x] Return Manifest info when done

- [x] QueryCurrentVersions

### New features
- [x] Multithreaded Download and Install

### Stubbed commands

`SetManifests`, `Repair`, `CollectGarbage`

Those will not do anything and will just return `[(TaskID), "Ok"]`
