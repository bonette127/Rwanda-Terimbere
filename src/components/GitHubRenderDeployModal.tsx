import React, { useState } from "react";
import { Language } from "../types";
import {
  CheckCircle2,
  Cloud,
  Code2,
  Copy,
  FileCode,
  FolderGit2,
  Globe,
  RotateCcw,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
  Lock,
  Key,
  Boxes,
} from "lucide-react";

interface GitHubRenderDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onResetCleanSlate: () => void;
}

export const GitHubRenderDeployModal: React.FC<
  GitHubRenderDeployModalProps
> = ({ isOpen, onClose, language, onResetCleanSlate }) => {
  const [githubUsername, setGithubUsername] = useState("your-username");
  const [repoName, setRepoName] = useState("terimbere-agrirwanda-pro");
  const [activeStep, setActiveStep] = useState<
    "github" | "render" | "docker" | "admin" | "wrapup"
  >("github");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [checklist, setChecklist] = useState({
    cleanSlateVerified: true,
    githubRepoCreated: false,
    codePushedToMain: false,
    renderServiceLinked: false,
    geminiKeyConfigured: false,
  });

  if (!isOpen) return null;

  const cleanUser = githubUsername.trim() || "your-username";
  const cleanRepo = repoName.trim() || "terimbere-agrirwanda-pro";

  const gitCommands = `git init
git add .
git commit -m "Initial clean-slate release of TERIMBERE AgriRwanda Pro"
git branch -M main
git remote add origin https://github.com/${cleanUser}/${cleanRepo}.git
git push -u origin main`;

  const renderYamlContent = `services:
  - type: web
    name: ${cleanRepo}
    runtime: node
    plan: free
    buildCommand: npm install --include=dev && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: GEMINI_API_KEY
        sync: false`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 2200);
  };

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-teal-900 px-6 py-5 text-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 mt-0.5">
              <Cloud className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  {language === "rw"
                    ? "Gushyira ku Rubuga (GitHub & Render)"
                    : "GitHub & Render Cloud Deployment Center"}
                </span>
                <span className="text-xs text-amber-300 font-semibold">
                  {completedCount}/5{" "}
                  {language === "rw" ? "Byuzuye" : "Steps Completed"}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight mt-1">
                {language === "rw"
                  ? " Kubika kuri GitHub & Kohereza kuri Render (Project Wrap-Up)"
                  : "Host on GitHub & Deploy Live to Render"}
              </h2>
              <p className="text-xs text-emerald-100/85 mt-0.5">
                {language === "rw"
                  ? " Intambwe zoroshye zo kubika umushinga wawe usukuye kuri GitHub no kuwushyira ku rubuga rwa Render."
                  : "Everything is configured (`render.yaml`, `.gitignore`, production build scripts, and clean-slate state) to wrap up your project."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation Tabs */}
        <div className="px-6 py-3 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveStep("github")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeStep === "github"
                  ? "bg-emerald-900 text-white shadow-2xs"
                  : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-emerald-400"
              }`}
            >
              <FolderGit2 className="w-4 h-4" />
              <span>
                1.{" "}
                {language === "rw"
                  ? "Kohereza kuri GitHub"
                  : "Host on GitHub"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep("render")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeStep === "render"
                  ? "bg-emerald-900 text-white shadow-2xs"
                  : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-emerald-400"
              }`}
            >
              <Server className="w-4 h-4" />
              <span>
                2.{" "}
                {language === "rw"
                  ? "Gushyira kuri Render"
                  : "Deploy to Render"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep("docker")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeStep === "docker"
                  ? "bg-emerald-900 text-white shadow-2xs"
                  : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-emerald-400"
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>
                3.{" "}
                {language === "rw"
                  ? "Docker Container"
                  : "Docker Container"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep("admin")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeStep === "admin"
                  ? "bg-emerald-900 text-white shadow-2xs"
                  : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-emerald-400"
              }`}
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>
                4.{" "}
                {language === "rw"
                  ? "Konti y'Umuyobozi (Admin)"
                  : "Admin Access"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep("wrapup")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeStep === "wrapup"
                  ? "bg-emerald-900 text-white shadow-2xs"
                  : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-emerald-400"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                5.{" "}
                {language === "rw"
                  ? "Gusukura & Gusoza"
                  : "Launch Checklist"}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={onResetCleanSlate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>
              {language === "rw"
                ? "Sukura Byose (Clean Slate)"
                : "Reset Clean Slate"}
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeStep === "github" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70">
                <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-emerald-700" />
                  <span>
                    {language === "rw"
                      ? "Intambwe ya 1: Shyira Umushinga kuri GitHub"
                      : "Step 1: Push Your Clean-Slate Project to GitHub"}
                  </span>
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                  {language === "rw"
                    ? "Andika izina ukoresha kuri GitHub n'izina ry'ububiko (Repository) ushaka gufungura kuri github.com/new, hanyuma ukoporore amabwiriza ya Git ahite agufasha."
                    : "Enter your GitHub username and repository name below to generate exact terminal commands. Make sure you create an empty repository at github.com/new first."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                      GitHub Username
                    </label>
                    <input
                      type="text"
                      value={githubUsername}
                      onChange={(e) => setGithubUsername(e.target.value)}
                      placeholder="e.g. kibondoqueenmary"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-mono text-stone-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Repository Name
                    </label>
                    <input
                      type="text"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      placeholder="terimbere-agrirwanda-pro"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-mono text-stone-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Terminal Commands Box */}
              <div className="rounded-xl bg-stone-950 text-stone-100 p-4 border border-stone-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <Terminal className="w-4 h-4" />
                    <span>Terminal — Git Push Commands</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(gitCommands, "git")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    {copiedKey === "git" ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Commands</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs font-mono text-stone-200 overflow-x-auto leading-relaxed">
                  {gitCommands}
                </pre>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-stone-500">
                  {language === "rw"
                    ? "Fayili za .gitignore na README.md zamaze gutegurwa mu mushinga."
                    : "Both .gitignore and README.md are already included in the project root."}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveStep("render")}
                  className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {language === "rw"
                    ? "Komeza ku Ntambwe ya 2: Render →"
                    : "Next Step: Deploy to Render →"}
                </button>
              </div>
            </div>
          )}

          {activeStep === "render" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/70">
                <h3 className="text-sm font-bold text-teal-950 dark:text-teal-200 flex items-center gap-2">
                  <Server className="w-4 h-4 text-teal-700" />
                  <span>
                    {language === "rw"
                      ? "Intambwe ya 2: Kohereza Umushinga kuri Render.com"
                      : "Step 2: Deploy Full-Stack Web Service on Render"}
                  </span>
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                  {language === "rw"
                    ? " Twamaze gushyiramo fayili ya `render.yaml` mu muzi w'umushinga. Ushobora gukoresha 'Blueprint' kuri Render cyangwa ukuzuzamo Build na Start Commands zikurikira:"
                    : "We have pre-configured `render.yaml` in the root folder. On dashboard.render.com, click 'New +' → 'Web Service' (or 'Blueprint'), connect your GitHub repository, and verify these settings:"}
                </p>
              </div>

              {/* Render Settings Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-stone-500">
                      Build Command
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          "npm install --include=dev && npm run build",
                          "buildCmd"
                        )
                      }
                      className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedKey === "buildCmd" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <code className="block mt-1.5 text-xs font-mono font-bold text-stone-900 dark:text-white bg-white dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-700">
                    npm install --include=dev && npm run build
                  </code>
                </div>

                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-stone-500">
                      Start Command
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy("npm start", "startCmd")}
                      className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedKey === "startCmd" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <code className="block mt-1.5 text-xs font-mono font-bold text-stone-900 dark:text-white bg-white dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-700">
                    npm start
                  </code>
                </div>
              </div>

              {/* Environment Variables */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-emerald-700" />
                  <span>
                    Render Environment Variables (Dashboard → Environment)
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-stone-800">
                    <span className="text-stone-500">Key:</span>{" "}
                    <strong className="text-stone-900 dark:text-white">
                      NODE_ENV
                    </strong>{" "}
                    • <span className="text-stone-500">Value:</span>{" "}
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      production
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-stone-800">
                    <span className="text-stone-500">Key:</span>{" "}
                    <strong className="text-stone-900 dark:text-white">
                      GEMINI_API_KEY
                    </strong>{" "}
                    • <span className="text-stone-500">Value:</span>{" "}
                    <strong className="text-amber-700 dark:text-amber-400">
                      (Your Gemini API Key)
                    </strong>
                  </div>
                </div>
              </div>

              {/* render.yaml Blueprint Preview */}
              <div className="rounded-xl bg-stone-950 text-stone-100 p-4 border border-stone-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
                    <FileCode className="w-4 h-4" />
                    <span>render.yaml (Included in Project Root)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(renderYamlContent, "yaml")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    {copiedKey === "yaml" ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy render.yaml</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs font-mono text-stone-200 overflow-x-auto leading-relaxed">
                  {renderYamlContent}
                </pre>
              </div>
            </div>
          )}

          {activeStep === "docker" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/70">
                <h3 className="text-sm font-bold text-blue-950 dark:text-blue-200 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-blue-700" />
                  <span>
                    {language === "rw"
                      ? "Intambwe ya 3: Gushyira Umushinga muri Docker Container"
                      : "Step 3: Docker Container Build & Run"}
                  </span>
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                  {language === "rw"
                    ? "Dockerfile yamaze gukorwa mu mizi y'umushinga. Koresha amabwiriza akurikira kugira ngo wubake (build) kandi wiruke (run) kuri seriveri yawe yose."
                    : "A production multi-stage Dockerfile is configured in the project root. Build and run locally or on any cloud container service."}
                </p>
              </div>

              <div className="rounded-xl bg-stone-950 text-stone-100 p-4 border border-stone-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                    <Terminal className="w-4 h-4" />
                    <span>Docker Commands</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        `# Build container\ndocker build -t terimbere-agrirwanda .\n\n# Run on port 3000\ndocker run -d -p 3000:3000 -e GEMINI_API_KEY="your-gemini-key" terimbere-agrirwanda`,
                        "docker"
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    {copiedKey === "docker" ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Commands</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                  {`# Build the production image\ndocker build -t terimbere-agrirwanda .\n\n# Run the production container on port 3000\ndocker run -d -p 3000:3000 -e GEMINI_API_KEY="your-key-here" --name terimbere-app terimbere-agrirwanda`}
                </pre>
              </div>
            </div>
          )}

          {activeStep === "admin" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800">
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-700" />
                  <span>
                    {language === "rw"
                      ? "Uburenganzira bw'Ubuyobozi Bukuru (Master Admin Credentials)"
                      : "Authorized Master Administrator Credentials"}
                  </span>
                </h3>
                <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 leading-relaxed">
                  {language === "rw"
                    ? "Ubu buryo bweguriwe abayobozi ba Minisiteri cyangwa Koperative gusa. Koresha iyi myirondoro winjire muri Panel y'Ubuyobozi:"
                    : "Access is restricted to authorized personnel only. Use the verified administrator credentials below to access governance controls:"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1.5">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                    Admin Username / Email
                  </span>
                  <div className="flex items-center justify-between font-mono font-black text-sm text-stone-900 dark:text-white">
                    <span>admin@terimbere.rw</span>
                    <button
                      type="button"
                      onClick={() => handleCopy("admin@terimbere.rw", "admin_user")}
                      className="text-stone-400 hover:text-emerald-700 p-1"
                    >
                      {copiedKey === "admin_user" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <span className="text-[10px] text-stone-400">
                    Alias: <code className="font-mono font-bold">admin</code>
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1.5">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                    Master Admin Password
                  </span>
                  <div className="flex items-center justify-between font-mono font-black text-sm text-amber-700 dark:text-amber-300">
                    <span>TerimbereAdmin2026!</span>
                    <button
                      type="button"
                      onClick={() => handleCopy("TerimbereAdmin2026!", "admin_pass")}
                      className="text-stone-400 hover:text-emerald-700 p-1"
                    >
                      {copiedKey === "admin_pass" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <span className="text-[10px] text-stone-400">
                    Restricted Authorization Key
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-100 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400 space-y-2">
                <h4 className="font-bold text-stone-900 dark:text-stone-100">
                  {language === "rw"
                    ? "Ibyo Umuyobozi Bukuru Ashobora Gukora (Admin Powers):"
                    : "Administrator Privileges & Controls:"}
                </h4>
                <ul className="list-disc list-inside space-y-1 leading-relaxed">
                  <li>
                    {language === "rw"
                      ? "Gucunga abahinzi bose n'imirima yabo mu Rwanda hose."
                      : "Governance over all registered farmers and parcels nationwide."}
                  </li>
                  <li>
                    {language === "rw"
                      ? "Kumenyekanisha ibiciro bishya by'amasoko no gutanga integuza z'indwara n'ibyonnyi."
                      : "Broadcast official daily market prices and national emergency pest advisories."}
                  </li>
                  <li>
                    {language === "rw"
                      ? "Gukurikirana nkunganire za Leta (Smart Nkunganire Subsidies) ku ifumbire n'imbuto."
                      : "Monitor subsidized fertilizer and certified seed allocations across districts."}
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeStep === "wrapup" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <span>
                    {language === "rw"
                      ? "Urutonde Nyobozi rwo Gusoza Umushinga (Project Wrap-Up)"
                      : "Final Project Wrap-Up & Verification Checklist"}
                  </span>
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">
                  {language === "rw"
                    ? "Kanda ku ntambwe umaze kuzuza. Sisitemu ubu irakora mu buryo bwikora buri munsi, nta makuru y'igerageza cyangwa abakoresha b'igerageza barimo."
                    : "Mark each milestone as you complete your deployment. All sample records and test users have been removed so your production deployment begins on a true clean slate."}
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    key: "cleanSlateVerified" as const,
                    titleRw:
                      "1. Paji Nshya Isukuye & Kuvugurura Buri Munsi (Clean Slate & Dynamic Day)",
                    titleEn:
                      "1. Clean Slate Verified & Global Dynamic Day Engine Active",
                    descRw:
                      "Amakuru y'icyitegererezo n'abakoresha b'igerageza byakuwemo; itariki n'inama zihinduka buri munsi mu buryo bwiyubashye.",
                    descEn:
                      "Zero sample farms, zero test users, respectful bilingual advisor tone, and automatic daily date/season rollover.",
                  },
                  {
                    key: "githubRepoCreated" as const,
                    titleRw:
                      "2. Gufungura Ububiko kuri GitHub (Create GitHub Repository)",
                    titleEn:
                      "2. Create GitHub Repository (github.com/new)",
                    descRw: `Fungura repository yitwa "${cleanRepo}" kuri GitHub.`,
                    descEn: `Create a new repository named "${cleanRepo}" on your GitHub account.`,
                  },
                  {
                    key: "codePushedToMain" as const,
                    titleRw:
                      "3. Kohereza Code kuri GitHub (git push -u origin main)",
                    titleEn:
                      "3. Push Codebase to GitHub Main Branch",
                    descRw:
                      "Koresha amabwiriza yo mu gice cya 1 wohereze code zose kuri GitHub.",
                    descEn:
                      "Run the git init, commit, and push commands from Step 1.",
                  },
                  {
                    key: "renderServiceLinked" as const,
                    titleRw:
                      "4. Guhuza GitHub na Render Web Service",
                    titleEn:
                      "4. Connect GitHub Repo to Render Web Service / Blueprint",
                    descRw:
                      "Huza repository yawe na Render.com ukoresheje render.yaml cyangwa Build/Start commands.",
                    descEn:
                      "Link your repository on Render using the included render.yaml Blueprint.",
                  },
                  {
                    key: "geminiKeyConfigured" as const,
                    titleRw:
                      "5. Gushyiramo GEMINI_API_KEY kuri Render & Gusuzuma /api/health",
                    titleEn:
                      "5. Set GEMINI_API_KEY on Render & Verify Live URL",
                    descRw:
                      "Shyiramo urufunguzo rwa Gemini muri Environment Variables za Render, maze ufungure urubuga rwawe!",
                    descEn:
                      "Add GEMINI_API_KEY in Render Environment settings and open your live production URL.",
                  },
                ].map((item) => {
                  const checked = checklist[item.key];
                  return (
                    <div
                      key={item.key}
                      onClick={() => toggleCheck(item.key)}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        checked
                          ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400"
                          : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-emerald-400"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                          checked
                            ? "bg-emerald-700 text-white"
                            : "border-2 border-stone-300 dark:border-stone-600"
                        }`}
                      >
                        {checked && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 dark:text-white">
                          {language === "rw" ? item.titleRw : item.titleEn}
                        </h4>
                        <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                          {language === "rw" ? item.descRw : item.descEn}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-stone-50 dark:bg-stone-800/80 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
            <Globe className="w-4 h-4 text-emerald-700" />
            <span>
              {language === "rw"
                ? "Urubuga rwiteguye kujya hanze (Production Ready • Port 3000 / Render Dynamic PORT)"
                : "Production Ready • Express + Vite SPA Bundle • Health Check: /api/health"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-stone-700 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {language === "rw" ? "Funga" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
};
