# Rosetta Stone Mic Fix for Safari

A small Safari extension for the Mac. It fixes Rosetta Stone speaking activities that never hear you in Safari.

## Is this your problem?

You use Rosetta Stone's web app (rosettastone.com) in Safari on a Mac, and:

- speaking activities never recognize what you say, even though Safari has microphone permission for the site;
- your microphone works in Safari on other sites;
- the input level meter in System Settings › Sound moves normally until a lesson starts, then stops moving.

This was diagnosed and fixed on one Mac: a MacBook Pro (M1 Pro) on macOS 27.3 and Safari 27.3, using the built-in microphone. Other Macs and versions haven't been tested yet. If you try it, please [open an issue](../../issues) with your Mac model, your macOS and Safari versions, and whether it helped.

## What goes wrong

Rosetta Stone opens the microphone twice at the same time. One stream stays open for the whole lesson with echo cancellation on. For each speaking prompt it opens a second stream with all audio processing turned off (`echoCancellation: false`). On the affected Mac, while the first stream is open, Safari gives the second stream near-silence, about −66 dB while you're talking. Safari still reports that stream as working, so Rosetta Stone just hears nothing.

## What the extension does

When rosettastone.com asks for the microphone, the extension changes the request to ask for echo-cancelled audio (`echoCancellation: true`). It also drops a few Chrome-only `goog*` options. Safari then delivers normal audio, and speech is recognized. It changes nothing else.

- It runs only on rosettastone.com.
- It makes no network requests and collects nothing.
- The whole fix is about 20 lines: [`extension/mic-fix.js`](extension/mic-fix.js).

The technical write-up is in [docs/diagnosis.md](docs/diagnosis.md).

## Install

### Option 1: try it now without Xcode (temporary)

Safari can load an extension folder directly for testing. Safari removes it after 24 hours, or when you quit Safari ([Apple's instructions](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension)).

1. Download this repository (**Code › Download ZIP**) and unzip it.
2. In Safari, choose **Safari › Settings › Advanced** and tick **Show features for web developers**.
3. Open the **Developer** tab, click **Add Temporary Extension…**, and choose the `extension` folder.
4. In the **Extensions** tab, make sure **Rosetta Stone Mic Fix** is on, and allow it on rosettastone.com.
5. Reload your lesson.

So far the fix has been confirmed with the Xcode-built app (option 2). This temporary install loads the same files, but nobody has tested it on an affected Mac yet.

### Option 2: build the app in Xcode (permanent)

You need Xcode 27 or later, because the project uses Xcode 27's project format. A free Apple Account signed in to Xcode is enough.

1. Open `macos-app/Rosetta Mic Fix.xcodeproj`.
2. For both targets, open **Signing & Capabilities**, choose your team, and change the bundle identifier to one of your own, for example `com.yourname.RosettaMicFix`. The extension's identifier must be the app's identifier followed by `.Extension`.
3. Choose **Product › Run**. When the app opens, click **Quit and Open Safari Settings…**.
4. Turn on **Rosetta Stone Mic Fix** in **Safari › Settings › Extensions**, allow it on rosettastone.com, and reload your lesson.

If Safari doesn't list the extension, open **Safari › Settings › Developer** and tick **Allow unsigned extensions**. Safari turns that setting off again each time it quits.

## Check that it's working

On a rosettastone.com page, open **Develop › Show Web Inspector › Console** and run:

```js
document.documentElement.getAttribute('data-rs-mic-fix')
```

It should return `"active"`.

## Uninstall

Untick the extension in **Safari › Settings › Extensions**. If you built the app, delete `Rosetta Mic Fix.app` as well.

## Reproduce the underlying Safari behavior

[`repro/index.html`](repro/index.html) opens two microphone streams the way Rosetta Stone does and shows the live level of each. Microphone access needs a secure page, so serve it from your own Mac:

```sh
cd repro
python3 -m http.server 8000
```

Then open <http://localhost:8000> in Safari. Click **Start A**, then **Start B**, and speak. On an affected Mac, B should stay near silent while A is running. This page isolates the pattern seen on rosettastone.com, but it hasn't yet been run on the affected Mac, so treat it as unconfirmed.

## Tools

The [`tools`](tools) folder has the small diagnostics used to find the cause:

- `probe.js` logs every microphone request a page makes and what Safari returns. Paste it into the Web Inspector console before a lesson starts.
- `meter.swift` reads the raw microphone level from outside Safari: `swift tools/meter.swift 10`.
- `ca.swift` lists audio input devices and which processes are using them.

## Reports

This is a workaround. The real fixes belong to Rosetta Stone, which could reuse its first microphone stream instead of opening a second one, and to Apple, since Safari shouldn't deliver silence while reporting the stream as live. Reports to both are being filed, and this section will link to them.

## Not affiliated

This project isn't affiliated with or endorsed by Rosetta Stone or Apple. Rosetta Stone is a trademark of its owner.

## License

[MIT](LICENSE)
