# FAQ

For all the questions.

## What is updater.node?

`updater.node` is a node addon of `app.asar` that interacts with Discord's update server and installs updates. It is only for Windows users.

`updater.node` also has a function that gets known folders and creates shortcuts.

## Will this 100% match the original?

Rust is hard to reverse-engineer with, *I tried to do this before switching to the approach I am doing right now*. So this will not be 100% match the original bytecode. However, you would expect the functionalities will be intact.

Besides I want to do improvements to `updater.node` anyways.

## Will this include Discord's code?

**No.** Although this is not a competing replacement of Discord, it's better safe to make a completely new code than to include Discord's. Just look at Spacebar.

## How does this compare to Mu (OpenAsar)?

Mu is a different implementation that uses their own server. (Also according to Ducko/CanadaHonk it's dead)

reUpdater is just a replacement that replaces a part of Discord's **frontend** code, replicating the exact same in terms of functionality.

Ignoring the technical side, reUpdater uses Discord's server so it would be updated as same as Discord's, Mu will lag behind in this a little bit.

(Sidenote: Mu, and by extension OpenAsar removes functions that are deemed unnesecary for an asar replacement, for repackers like me, that's bad enough. No hate for OpenAsar though!)

## Will I use this to connect to a compatible backend replacement?

Sure you can! Although it's not on this side of the frontend though, you should change it in `app.asar`.

## What improvements does this have over the original?

Multithreading. That's it. As I want to keep it 100% compatible with `app.asar`, not removing features from the original and mostly same functionality