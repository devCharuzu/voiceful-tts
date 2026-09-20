# Voiceful

Voiceful is a free, browser-based text-to-speech app. It turns your words into a WAV audio file that you can download as many times as you like.

The app runs the voice models on your own device. There is no account, no API key, and no monthly limit.

## What it can do

- Convert short text or long paragraphs into speech.
- Keep paragraph breaks with a small natural pause.
- Choose from all 24 English Piper models included in this version.
- Use female, male, neutral, and multi-speaker model options.
- Download every model with one button for easier offline use.
- Choose a delivery style: Professional, Warm, Calm, Energetic, or Serious.
- Change playback speed.
- Download unlimited WAV files.
- Keep downloaded models in your browser cache so later generations are faster.

## Important: English and Tagalog

This version includes English Piper models. A reliable free Tagalog/Filipino Piper model was not available in the model catalog used by this app, so Tagalog is not listed as a supported voice. Tagalog text may still produce English-style pronunciation, but it should not be treated as a Tagalog voice.

The model list is based on the [Piper voice catalog](https://github.com/rhasspy/piper/blob/master/src/python_run/piper/voices.json). Always check the individual model license before using a voice for business or commercial work.

## What you need

You need:

1. A modern browser such as Chrome, Edge, Brave, or Firefox.
2. Python 3 **or** Node.js installed on your computer.
3. An internet connection the first time you use a voice, because the browser must download that model.

You do not need to install a database, an AI API, or an npm package.

## Get the project

If Git is installed, open Terminal or Command Prompt and run:

```bash
git clone https://github.com/devCharuzu/voiceful-tts.git
cd voiceful-tts
```

If you do not have Git, open the [Voiceful GitHub page](https://github.com/devCharuzu/voiceful-tts), click the green **Code** button, choose **Download ZIP**, and unzip the downloaded file. Then open Terminal or Command Prompt inside the unzipped `voiceful-tts` folder.

## Easiest way to run it

### macOS or Linux

Open Terminal, go to the project folder, and run:

```bash
python3 --version
python3 -m http.server 4173 --directory dist
```

### Windows

Open Command Prompt or PowerShell, go to the project folder, and run:

```cmd
py --version
py -m http.server 4173 --directory dist
```

Then open this address in your browser:

```text
http://127.0.0.1:4173
```

Keep the Terminal or Command Prompt window open while you use the app. To stop the server, press **Ctrl + C**.

## If Python is not installed

Install Node.js from [nodejs.org](https://nodejs.org/), then run:

```bash
node --version
npx --yes serve dist --listen 4173
```

Open:

```text
http://127.0.0.1:4173
```

You only need one of the Python or Node.js options.

## How to use Voiceful

1. Type or paste your script into the large text box. You can use multiple paragraphs.
2. Click any model in the **All available English Piper models** list.
3. Choose a delivery style if you want one.
4. Click **Generate audio**.
5. When the audio is ready, click **Download WAV**.

The first generation with a model may take longer because the model is downloaded. After that, the browser normally reuses its local copy.

### Download every model first

If you want every voice ready before writing a script:

1. Click **Download all models**.
2. Wait until the progress bar says that all models are ready.
3. Select any model and click **Generate audio**.

All 24 models together are about **1.7 GB**, so this can take time and use a large amount of internet data. The files are stored in your browser, not in this repository. Clearing browser site data may remove them.

## Common problems

### The page is blank or buttons do not work

Make sure you started a local server. Do not open `dist/index.html` by double-clicking it. Browser modules and local model files work more reliably through `http://127.0.0.1:4173`.

### The first generation is slow

That is normal. The selected voice model is being downloaded and prepared. Keep the browser open and try again if the connection stops.

### The voice sounds like English instead of Tagalog

This release does not contain a Tagalog voice model. The listed models are English Piper voices.

### I need to free disk or browser storage

Open your browser's site settings for `127.0.0.1:4173` and clear its stored data. This removes cached voice models, so they will need to be downloaded again.

## Project files

```text
dist/index.html            The app page
dist/styles.css            The app design
dist/app.js                Voice selection, generation, downloads, and controls
dist/voice-config.mjs      The complete model list and model sizes
dist/delivery-styles.mjs   The five tested delivery styles
dist/paragraphs.mjs        Paragraph splitting and cleanup
dist/model-download.mjs    Download totals and progress calculations
tests/                     Small regression tests
```

This is a static web app, so there is no build step. The files inside `dist/` are the files served to the browser.

## Run the tests

Node.js is needed for the tests. From the project folder, run:

```bash
node --check dist/app.js
node tests/paragraph-regression.mjs
node tests/voice-selection-regression.mjs
node tests/delivery-style-regression.mjs
node tests/model-download-regression.mjs
```

If each test is working, it prints `PASS`.

## License and model responsibility

The app code and the voice models may have different licenses. Review the license for each model before redistributing audio or using a model commercially. This project does not upload your script to a server; model downloads come from the configured public model package and are cached by your browser.
