# Codebase Parser and Document Generator

## Purpose
Convert a project folder into a single, well-formatted **.txt** or **.pdf**, so that the whole codebase can be uploaded 
to a preferred Large Language Model (LLM) platform (such as OpenAI, Claude, Gemini etc.) for further queries.

## Installation

Prerequisites
1. Node ≥ 18 (includes npm) – https://nodejs.org
2. git – https://git-scm.com

Steps
```bash
# 1 . clone the repo
git clone https://github.com/rasheeqqua/CodeParse.git
cd CodeParse

# 2 . install pnpm (once per machine)
npm install -g pnpm

# 3 . install project dependencies
pnpm install

# 4 . start the dev server (Vite)
pnpm run dev

↳ then visit http://localhost:5173 on your browser.
```

A production build can be created with `pnpm run build` and served with any static file server (`pnpm run preview` for local testing).

## How to use

1. In the running web-app click **“Select Folder”** and choose the root directory of your project.
2. Review the tree:
   • Files mentioned in `.gitignore` are excluded automatically.
   • If the app cannot find `.gitignore`, files are selected if they match the common code extensions.
3. (Optional) Tick/untick folders or individual files. A live counter shows the total size (50 MB limit).
4. Press **“Generate Documents”**.
5. When processing finishes, scroll down and click on **“Download TXT”** or **“Download PDF”**.
6. Upload the resulting file(s) into ChatGPT, Claude, Gemini, etc., and start asking questions about your codebase.

Tip: The first 2000 characters of the `.txt` file are previewed in the UI so you can sanity-check before downloading.

## Contributing

Issues and pull-requests are welcome! Please run `pnpm run lint && pnpm test` before submitting.