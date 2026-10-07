import React, { useState } from "react";
import { User, Language, UserRole } from "../types";
import {
  Lock,
  User as UserIcon,
  CheckCircle2,
  X,
  ShieldCheck,
  Sprout,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLogin: (user: User) => void;
  language: Language;
  registeredUsers?: User[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  language,
  registeredUsers = [],
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(
    registeredUsers.length === 0
  );
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Registration Form State (Clean Slate - no pre-filled test user names)
  const [regName, setRegName] = useState("");
  const [regNationalId, setRegNationalId] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regRole, setRegRole] = useState<UserRole>("farmer");
  const [regDistrict, setRegDistrict] = useState("Musanze");
  const [regSector, setRegSector] = useState("Kinigi");
  const [regCrop, setRegCrop] = useState("Ibirayi (Kinigi)");
  const [regSize, setRegSize] = useState("0.5");
  const [regPassword, setRegPassword] = useState("");

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInput = usernameOrEmail.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanInput || !cleanPass) {
      setError(
        language === "rw"
          ? "Turagusaba kwinjiza izina ry'ukoresha n'ijambo ry'ibanga."
          : "Please kindly enter both your username/email and password."
      );
      return;
    }

    // Check Master Administrator Access
    if (cleanInput === "admin" || cleanInput === "admin@terimbere.rw") {
      if (cleanPass === "TerimbereAdmin2026!" || cleanPass === "admin2026") {
        const masterAdminUser: User = {
          id: "user-admin-master",
          username: "admin",
          name: "Cooperative / Minagri Master Administrator",
          email: "admin@terimbere.rw",
          phone: "+250 788 123 456",
          role: "admin",
          district: "Kigali",
          sector: "Nyarugenge",
          farmSizeHa: 0,
          primaryCrop: "National Agricultural Governance",
          verified: true,
          nationalId: "1199080012345678",
          nidVerified: true,
          cooperativeName: "TERIMBERE National Agricultural Governance",
          createdAt: "2026-01-01",
        };

        setSuccessMsg(
          language === "rw"
            ? "Murakaza neza Muyobozi! Uburenganzira bw'ubuyobozi bukuru (Admin) bwemejwe."
            : "Authorized Administrator access verified! Opening Admin Control Center."
        );

        setTimeout(() => {
          onLogin(masterAdminUser);
          onClose();
        }, 450);
        return;
      } else {
        setError(
          language === "rw"
            ? "Ijambo ry'ibanga ry'ubuyobozi (Admin) si ryo. Uburenganzira bweguriwe abayobozi babiherewe uruhushya gusa."
            : "Invalid administrator password. Access restricted to authorized personnel only."
        );
        return;
      }
    }

    const found = registeredUsers.find(
      (u) =>
        u.username.toLowerCase() === cleanInput ||
        u.email.toLowerCase() === cleanInput ||
        u.phone.replace(/\s+/g, "") === cleanInput.replace(/\s+/g, "")
    );

    if (found) {
      setSuccessMsg(
        language === "rw"
          ? `Murakaza neza, ${found.name}! Twinjiye neza.`
          : `Welcome back, ${found.name}! Signing you in now.`
      );
      setTimeout(() => {
        onLogin(found);
        onClose();
      }, 450);
      return;
    }

    setError(
      language === "rw"
        ? "Konti ntiyabonetse. Turagusaba kwiyandikisha no gufungura konti yawe nshya hasi."
        : "No matching account was found. Please kindly register a new account first."
    );
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regName.trim() || !regPhone.trim()) {
      setError(
        language === "rw"
          ? "Turagusaba kuzuza amazina yawe na numero ya telefone."
          : "Please kindly fill in your full name and phone number."
      );
      return;
    }

    const cleanNid = regNationalId.replace(/\s+/g, "");

    const newUser: User = {
      id: `user-${Date.now()}`,
      username:
        regUsername.trim() ||
        regEmail.trim().split("@")[0] ||
        regPhone.replace(/\s+/g, ""),
      name: regName.trim(),
      email:
        regEmail.trim() || `${regPhone.replace(/\s+/g, "")}@terimbere.rw`,
      phone: regPhone.trim(),
      role: regRole,
      district: regDistrict,
      sector: regSector.trim() || "Kinigi",
      farmSizeHa: parseFloat(regSize) || 0.5,
      primaryCrop: regCrop,
      verified: true,
      nationalId: cleanNid.length === 16 ? cleanNid : undefined,
      nidVerified: cleanNid.length === 16,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setSuccessMsg(
      language === "rw"
        ? `Konti ya ${newUser.name} yafunguwe neza! Ikaze muri TERIMBERE.`
        : `Account created for ${newUser.name}! Welcome to TERIMBERE.`
    );

    setTimeout(() => {
      onLogin(newUser);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-md shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden relative">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white font-bold shadow-inner">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight font-display">
                {isRegisterMode
                  ? language === "rw"
                    ? "Gufungura Konti Nshya"
                    : "Create Your Account"
                  : language === "rw"
                    ? "Kwinjira muri TERIMBERE"
                    : "Sign In to TERIMBERE"}
              </h2>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                {isRegisterMode
                  ? language === "rw"
                    ? "Tangira neza kuri paji nshya y'ubuhinzi bwawe"
                    : "Start fresh and manage your farms & seasonal plans"
                  : language === "rw"
                    ? "Injira muri konti yawe y'ubuhinzi"
                    : "Sign in with your registered account"}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {!isRegisterMode ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  {language === "rw"
                    ? "Izina ry'ukoresha / Imeyili / Telefone"
                    : "Username / Email / Phone"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder={
                      language === "rw"
                        ? "Andika imeyili cyangwa telefone yawe"
                        : "Enter your email or phone number"
                    }
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  {language === "rw"
                    ? "Ijambo ry'ibanga (Password)"
                    : "Password"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 text-stone-500 dark:text-stone-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {language === "rw"
                      ? "Kwinjira kurinzwe ku bayobozi babifitiye uburenganzira"
                      : "Restricted to authorized cooperative personnel only"}
                  </span>
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm transition-colors shadow-sm"
              >
                {language === "rw" ? "Injira" : "Sign In"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw"
                    ? "Amazina yawe yose (Full Name)"
                    : "Full Name"}{" "}
                  *
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder={
                    language === "rw" ? "Andika amazina yawe" : "Enter your full name"
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw"
                      ? "Telefone (MTN/Airtel)"
                      : "Phone Number"}{" "}
                    *
                  </label>
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="078..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Imeyili (Email)" : "Email Address"}
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Inshingano (Role)" : "Account Role"}
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  >
                    <option value="farmer">
                      {language === "rw" ? "Umuhinzi (Farmer)" : "Farmer"}
                    </option>
                    <option value="cooperative_manager">
                      {language === "rw"
                        ? "Umuyobozi wa Koperative"
                        : "Cooperative Manager"}
                    </option>
                    <option value="admin">
                      {language === "rw"
                        ? "Umuyobozi wa Sisitemu (Admin)"
                        : "System Administrator"}
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Akarere (District)" : "District"}
                  </label>
                  <select
                    value={regDistrict}
                    onChange={(e) => setRegDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  >
                    <option value="Musanze">Musanze</option>
                    <option value="Nyagatare">Nyagatare</option>
                    <option value="Huye">Huye</option>
                    <option value="Rubavu">Rubavu</option>
                    <option value="Gicumbi">Gicumbi</option>
                    <option value="Bugesera">Bugesera</option>
                    <option value="Rwamagana">Rwamagana</option>
                    <option value="Nyamagabe">Nyamagabe</option>
                    <option value="Gasabo">Gasabo (Kigali)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Igihingwa cya mbere" : "Primary Crop"}
                  </label>
                  <select
                    value={regCrop}
                    onChange={(e) => setRegCrop(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  >
                    <option value="Ibirayi (Kinigi)">Ibirayi (Potatoes)</option>
                    <option value="Ibigori (Maize)">Ibigori (Maize)</option>
                    <option value="Inyanya (Tomatoes)">Inyanya (Tomatoes)</option>
                    <option value="Ibishyimbo (Beans)">Ibishyimbo (Beans)</option>
                    <option value="Soya">Soya</option>
                    <option value="Ikawa (Coffee)">Ikawa (Coffee)</option>
                    <option value="Imboga">Imboga (Vegetables)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw"
                      ? "Ingano y'Ubutaka (Ha)"
                      : "Land Size (Ha)"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={regSize}
                    onChange={(e) => setRegSize(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw"
                    ? "Indangamuntu (National ID - Optional)"
                    : "National ID (16 Digits - Optional)"}
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={regNationalId}
                  onChange={(e) =>
                    setRegNationalId(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="1 1990 8 0012345 0 88"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm font-mono tracking-wider focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
                {regNationalId.length === 16 && (
                  <div className="flex items-center space-x-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>NIDA Format Valid</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw" ? "Ijambo ry'ibanga" : "Password"} *
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm transition-colors shadow-sm"
              >
                {language === "rw"
                  ? "Fungura Konti Yanjye"
                  : "Create My Account"}
              </button>
            </form>
          )}

          {/* Toggle between login and registration */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError(null);
              }}
              className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
            >
              {isRegisterMode
                ? language === "rw"
                  ? "Usanzwe ufite konti? Kanda hano winjire"
                  : "Already have an account? Sign in here"
                : language === "rw"
                  ? "Nta konti uragira? Iyandikishe hano"
                  : "New user? Create a fresh account here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
