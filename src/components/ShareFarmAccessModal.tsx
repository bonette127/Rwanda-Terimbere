import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Farm, Language, TeamMember, TeamRole, AccessPermission, User } from "../types";
import { getTranslation } from "../i18n";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Eye,
  Edit3,
  CheckCircle2,
  X,
  Phone,
  Mail,
  Copy,
  Check,
  Share2,
  Trash2,
  Sparkles,
  QrCode,
  MapPin,
  Sprout,
  AlertCircle,
  ExternalLink,
  MessageCircle,
  Send,
  Building2,
  Briefcase,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";

interface ShareFarmAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  farms: Farm[];
  language: Language;
  teamMembers: TeamMember[];
  onAddTeamMember: (member: Omit<TeamMember, "id" | "invitedAt" | "inviteCode" | "status">) => void;
  onUpdateTeamMember: (id: string, updates: Partial<TeamMember>) => void;
  onDeleteTeamMember: (id: string) => void;
  onSimulateMemberLogin?: (member: TeamMember) => void;
  currentUser: User | null;
  targetFarmId?: string | null;
}

export const ShareFarmAccessModal: React.FC<ShareFarmAccessModalProps> = ({
  isOpen,
  onClose,
  farms,
  language,
  teamMembers,
  onAddTeamMember,
  onUpdateTeamMember,
  onDeleteTeamMember,
  onSimulateMemberLogin,
  currentUser,
  targetFarmId,
}) => {
  const t = getTranslation(language);
  const [activeTab, setActiveTab] = useState<"invite" | "members">("invite");

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("0788");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("agronomist");
  const [permission, setPermission] = useState<AccessPermission>("manage");
  const [selectedFarmIds, setSelectedFarmIds] = useState<string[]>(() => {
    return targetFarmId ? [targetFarmId] : [];
  });
  const [allFarmsSelected, setAllFarmsSelected] = useState<boolean>(!targetFarmId);
  const [specialization, setSpecialization] = useState("");
  const [notes, setNotes] = useState("");

  // Post-invite feedback & sharing dialog state
  const [newlyCreatedMember, setNewlyCreatedMember] = useState<TeamMember | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedQrMember, setSelectedQrMember] = useState<TeamMember | null>(null);

  // When targetFarmId changes upon opening
  useEffect(() => {
    if (targetFarmId) {
      setSelectedFarmIds([targetFarmId]);
      setAllFarmsSelected(false);
    } else {
      setSelectedFarmIds([]);
      setAllFarmsSelected(true);
    }
  }, [targetFarmId, isOpen]);

  // Compute public invite url for newly invited or selected member
  const currentOrigin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin.replace("ais-dev-", "ais-pre-")
      : "https://ais-pre-tq6yuf3cz3drl3b5dc4frl-921861656596.europe-west2.run.app";

  const getInviteUrl = (code: string) => {
    return `${currentOrigin}?invite=${code}`;
  };

  // Generate QR code when a member is selected or created
  useEffect(() => {
    const memberForQr = newlyCreatedMember || selectedQrMember;
    if (memberForQr) {
      const url = getInviteUrl(memberForQr.inviteCode);
      QRCode.toDataURL(url, {
        width: 220,
        margin: 2,
        color: {
          dark: "#064e3b",
          light: "#ffffff",
        },
      })
        .then((dataUrl) => setQrCodeDataUrl(dataUrl))
        .catch((err) => console.error("Error generating QR:", err));
    }
  }, [newlyCreatedMember, selectedQrMember]);

  if (!isOpen) return null;

  const handleToggleFarm = (farmId: string) => {
    if (allFarmsSelected) {
      setAllFarmsSelected(false);
      setSelectedFarmIds([farmId]);
      return;
    }

    if (selectedFarmIds.includes(farmId)) {
      const next = selectedFarmIds.filter((id) => id !== farmId);
      setSelectedFarmIds(next);
      if (next.length === 0) {
        setAllFarmsSelected(true);
      }
    } else {
      const next = [...selectedFarmIds, farmId];
      setSelectedFarmIds(next);
      if (next.length === farms.length) {
        setAllFarmsSelected(true);
      }
    }
  };

  const handleSelectAllFarms = () => {
    setAllFarmsSelected(true);
    setSelectedFarmIds([]);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const assignedIds = allFarmsSelected ? [] : selectedFarmIds;

    const newMemberData = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      role,
      permission,
      assignedFarmIds: assignedIds,
      invitedBy: currentUser?.name || "Jean Baptiste Ndahiro (Farm Owner)",
      notes: notes.trim() || undefined,
      specialization:
        specialization.trim() ||
        (role === "agronomist"
          ? "Umujyanama w'Ubuhinzi (Agronomist Specialist)"
          : role === "worker"
          ? "Umukozi w'Umurima (Field Operations)"
          : "Umugenzuzi w'Ubuziranenge (Quality Inspector)"),
      avatarUrl:
        role === "agronomist"
          ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
          : role === "worker"
          ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
          : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    };

    onAddTeamMember(newMemberData);

    // Create an object to showcase the instant invite pass
    const created: TeamMember = {
      ...newMemberData,
      id: "tm-" + Date.now(),
      status: "pending_invitation",
      invitedAt: new Date().toISOString().split("T")[0],
      inviteCode: `TRM-${role.toUpperCase().slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    setNewlyCreatedMember(created);

    // Reset inputs
    setName("");
    setPhone("0788");
    setEmail("");
    setNotes("");
    setSpecialization("");
  };

  const getRoleLabel = (r: TeamRole) => {
    switch (r) {
      case "agronomist":
        return {
          rw: "Umujyanama w'Ubuhinzi (Agronomist)",
          en: "Agronomist / Extension Officer",
          badge: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
          icon: <Sprout className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case "worker":
        return {
          rw: "Umukozi w'Umurima (Field Worker)",
          en: "Field Worker / Team Lead",
          badge: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800",
          icon: <Briefcase className="w-3.5 h-3.5 text-amber-600" />,
        };
      case "cooperative_inspector":
        return {
          rw: "Umugenzuzi wa Koperative (Inspector)",
          en: "Cooperative Inspector",
          badge: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800",
          icon: <Building2 className="w-3.5 h-3.5 text-blue-600" />,
        };
    }
  };

  const getPermissionLabel = (p: AccessPermission) => {
    if (p === "manage") {
      return {
        rw: "Genzura & Andika (Manage & Record)",
        en: "Manage & Record Operations",
        badge: "bg-emerald-600 text-white font-bold",
        icon: <Edit3 className="w-3 h-3 text-white" />,
      };
    }
    return {
      rw: "Reba Gusa (View Only)",
      en: "View Only (Read-only)",
      badge: "bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold",
      icon: <Eye className="w-3 h-3 text-stone-600 dark:text-stone-300" />,
    };
  };

  const getAssignedFarmsText = (farmIds: string[]) => {
    if (!farmIds || farmIds.length === 0) {
      return language === "rw"
        ? `Imirima Yose (${farms.length})`
        : `All Parcels (${farms.length})`;
    }
    const matched = farms.filter((f) => farmIds.includes(f.id));
    return matched.map((f) => f.name).join(", ");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-3xl w-full border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 p-5 sm:p-6 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                <Users className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg sm:text-xl font-extrabold font-display tracking-tight">
                    {language === "rw"
                      ? "Gusangiza Umurima & Guha Uburenganzira Ikipe"
                      : "Farm Parcel Team Collaboration & Access Sharing"}
                  </h2>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-400 text-stone-950 uppercase">
                    Owner Control
                  </span>
                </div>
                <p className="text-xs text-emerald-200 dark:text-emerald-300 mt-0.5">
                  {language === "rw"
                    ? "Tumira abagize ikipe (Abajyanama b'ubuhinzi cyangwa Abakozi) kugira ngo bagenzure cyangwa barebe imirima runaka."
                    : "Invite Agronomists or Workers to view or manage specific farm parcels."}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Farm Owner Info Strip */}
          <div className="mt-4 pt-3 border-t border-emerald-700/50 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2 text-emerald-100">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>
                {language === "rw" ? "Nyirumurima (Master Owner):" : "Master Farm Owner:"}{" "}
                <strong className="text-white font-bold">
                  {currentUser?.name || "Jean Baptiste Ndahiro"}
                </strong>
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-emerald-200">
                {language === "rw" ? "Imirima Ihari:" : "Total Registered Parcels:"}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 font-mono font-bold text-amber-300 border border-emerald-700">
                {farms.length} {language === "rw" ? "Imirima" : "Parcels"}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="px-5 pt-3 bg-stone-100 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setActiveTab("invite");
                setNewlyCreatedMember(null);
                setSelectedQrMember(null);
              }}
              className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
                activeTab === "invite"
                  ? "bg-white dark:bg-stone-900 text-emerald-800 dark:text-emerald-400 border-emerald-600 shadow-xs"
                  : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{language === "rw" ? "Ohereza Ubutumire Bushya" : "Invite New Member"}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("members");
                setNewlyCreatedMember(null);
                setSelectedQrMember(null);
              }}
              className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
                activeTab === "members"
                  ? "bg-white dark:bg-stone-900 text-emerald-800 dark:text-emerald-400 border-emerald-600 shadow-xs"
                  : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>
                {language === "rw" ? "Ikipe n'Uburenganzira" : "Active Team & Permissions"}
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black">
                {teamMembers.length}
              </span>
            </button>
          </div>

          {targetFarmId && (
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hidden sm:flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {farms.find((f) => f.id === targetFarmId)?.name || "Selected Parcel"}
              </span>
            </div>
          )}
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: INVITE FORM */}
          {activeTab === "invite" && (
            <>
              {/* If newly invited member pass is shown */}
              {newlyCreatedMember ? (
                <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-emerald-900 dark:text-emerald-200">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      <div>
                        <h4 className="font-bold text-base">
                          {language === "rw"
                            ? "Ubutumire Bwashyizweho Neza!"
                            : "Parcel Invitation Created Successfully!"}
                        </h4>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                          {language === "rw"
                            ? `${newlyCreatedMember.name} ahawe uburenganzira bwo ${
                                newlyCreatedMember.permission === "manage"
                                  ? "kugenzura no kwandika ibikorwa"
                                  : "kureba gusa"
                              } ku mirima yatoranyijwe.`
                            : `${newlyCreatedMember.name} has been granted ${newlyCreatedMember.permission} access.`}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                      {newlyCreatedMember.inviteCode}
                    </span>
                  </div>

                  {/* QR & Share Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-white dark:bg-stone-900 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex flex-col items-center justify-center p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                      {qrCodeDataUrl ? (
                        <img
                          src={qrCodeDataUrl}
                          alt="Invite QR Code"
                          className="w-32 h-32 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-32 h-32 bg-stone-200 animate-pulse rounded-lg" />
                      )}
                      <span className="text-[10px] text-stone-500 mt-1 font-semibold flex items-center space-x-1">
                        <QrCode className="w-3 h-3 text-emerald-600" />
                        <span>Scan to Accept</span>
                      </span>
                    </div>

                    <div className="sm:col-span-2 space-y-2.5 flex flex-col justify-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">
                          {language === "rw" ? "Link yo guhererekanya (Direct Link)" : "Invite Link"}
                        </span>
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="text"
                            readOnly
                            value={getInviteUrl(newlyCreatedMember.inviteCode)}
                            className="w-full text-xs font-mono bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 text-stone-800 dark:text-stone-200 select-all"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                getInviteUrl(newlyCreatedMember.inviteCode)
                              );
                              setCopiedLink(true);
                              setTimeout(() => setCopiedLink(false), 2000);
                            }}
                            className="px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 flex items-center space-x-1"
                          >
                            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedLink ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Quick send options */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `Muraho ${newlyCreatedMember.name}, mwatumiwe na ${
                              currentUser?.name || "Jean Baptiste"
                            } nka ${
                              newlyCreatedMember.role === "agronomist"
                                ? "Umujyanama w'Ubuhinzi"
                                : "Umukozi w'Umurima"
                            } muri TERIMBERE. Kanda hano wemeze ubutumire: ${getInviteUrl(
                              newlyCreatedMember.inviteCode
                            )}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-200" />
                          <span>WhatsApp Invite</span>
                        </a>

                        {onSimulateMemberLogin && (
                          <button
                            onClick={() => {
                              onSimulateMemberLogin(newlyCreatedMember);
                              onClose();
                            }}
                            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all shadow-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>
                              {language === "rw"
                                ? "Gerageza kureba nka we (Simulate View)"
                                : "Simulate As This Member"}
                            </span>
                          </button>
                        )}

                        <button
                          onClick={() => setNewlyCreatedMember(null)}
                          className="px-3 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 text-xs font-semibold"
                        >
                          {language === "rw" ? "Tumira undi muntu" : "Invite Another"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs sm:text-sm">
                  {/* Step 1: Select Role */}
                  <div>
                    <label className="block font-bold text-stone-800 dark:text-stone-200 mb-2">
                      1. {language === "rw" ? "Hitamo Uruhare rw'Umutumirwa (Select Role) *" : "Select Role *"}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Agronomist Option */}
                      <button
                        type="button"
                        onClick={() => setRole("agronomist")}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          role === "agronomist"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 dark:border-emerald-500 shadow-sm"
                            : "bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:border-emerald-400"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                            <Sprout className="w-4 h-4" />
                          </div>
                          {role === "agronomist" && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                        <h4 className="font-bold text-stone-900 dark:text-white mt-2">
                          {language === "rw" ? "Umujyanama w'Ubuhinzi" : "Agronomist"}
                        </h4>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
                          {language === "rw"
                            ? "Inama z'indwara, ifumbire, gusuzuma ubutaka n'imiti ya RAB."
                            : "Pest diagnosis, fertilizer advisory, and RAB compliance."}
                        </p>
                      </button>

                      {/* Field Worker Option */}
                      <button
                        type="button"
                        onClick={() => setRole("worker")}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          role === "worker"
                            ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 shadow-sm"
                            : "bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:border-amber-400"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          {role === "worker" && (
                            <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                        <h4 className="font-bold text-stone-900 dark:text-white mt-2">
                          {language === "rw" ? "Umukozi w'Umurima" : "Field Worker / Lead"}
                        </h4>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
                          {language === "rw"
                            ? "Kwandika imirimo yakozwe, kuhira, kubagara no gucunga abakozi."
                            : "Field task logging, daily watering, weeding & labor tracking."}
                        </p>
                      </button>

                      {/* Cooperative Inspector Option */}
                      <button
                        type="button"
                        onClick={() => setRole("cooperative_inspector")}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          role === "cooperative_inspector"
                            ? "bg-blue-50 dark:bg-blue-950/60 border-blue-600 shadow-sm"
                            : "bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:border-blue-400"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                            <Building2 className="w-4 h-4" />
                          </div>
                          {role === "cooperative_inspector" && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <h4 className="font-bold text-stone-900 dark:text-white mt-2">
                          {language === "rw" ? "Umugenzuzi wa Koperative" : "Coop Inspector"}
                        </h4>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
                          {language === "rw"
                            ? "Kugenzura ubuziranenge n'inkomoko y'umusaruro ugana ku isoko."
                            : "Traceability audit and harvest quality inspection."}
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Step 2: Member Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        {language === "rw" ? "Amazina y'Umutumirwa *" : "Full Name *"}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={
                          role === "agronomist"
                            ? "urugero: Dr. Emmanuel Hakizimana"
                            : role === "worker"
                            ? "urugero: Faustin Mugabo"
                            : "urugero: Chantal Umutoni"
                        }
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        {language === "rw" ? "Numero ya Telefone (Momo / SMS) *" : "Phone Number (SMS / WhatsApp) *"}
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="0788 123 456"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-hidden font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        {language === "rw" ? "Imeyiri (Email - Optional)" : "Email (Optional)"}
                      </label>
                      <input
                        type="email"
                        placeholder="agronomist@rab.gov.rw"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        {language === "rw" ? "Umwihariko / Icyo ashinzwe" : "Specialization / Role Description"}
                      </label>
                      <input
                        type="text"
                        placeholder={
                          role === "agronomist"
                            ? "urugero: RAB Certified Soil & Pest Specialist"
                            : "urugero: Field Lead for Kinigi potato crops"
                        }
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Step 3: Parcel Selection (Specific Farm Parcels vs All) */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-bold text-stone-800 dark:text-stone-200">
                        2. {language === "rw" ? "Hitamo Imirima azagenzura (Farm Parcels Access) *" : "Assign Specific Farm Parcels *"}
                      </label>
                      <button
                        type="button"
                        onClick={handleSelectAllFarms}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                          allFarmsSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
                        }`}
                      >
                        {language === "rw" ? "Imirima Yose (All Parcels)" : "Grant All Parcels"}
                      </button>
                    </div>

                    {/* Parcel Cards Checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {farms.map((farm) => {
                        const isChecked = allFarmsSelected || selectedFarmIds.includes(farm.id);
                        return (
                          <div
                            key={farm.id}
                            onClick={() => handleToggleFarm(farm.id)}
                            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                              isChecked
                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 dark:border-emerald-500 shadow-xs"
                                : "bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 opacity-60 hover:opacity-100"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-1.5 font-bold text-stone-900 dark:text-white text-xs truncate">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate">{farm.name}</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleFarm(farm.id)}
                                className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 shrink-0"
                              />
                            </div>

                            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                              {farm.district}, {farm.sector}
                            </p>

                            <div className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-700/60 flex items-center justify-between text-[10px]">
                              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                                {farm.mainCrops.join(", ")}
                              </span>
                              <span className="font-mono font-bold text-stone-600 dark:text-stone-300">
                                {farm.sizeHa} Ha
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 4: Access Level / Permissions */}
                  <div className="pt-2">
                    <label className="block font-bold text-stone-800 dark:text-stone-200 mb-2">
                      3. {language === "rw" ? "Urwego rw'Uburenganzira (Permission Level) *" : "Access Permission *"}
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Manage Option */}
                      <button
                        type="button"
                        onClick={() => setPermission("manage")}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          permission === "manage"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 shadow-xs"
                            : "bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 hover:border-emerald-400"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                              <Edit3 className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-stone-900 dark:text-white text-xs">
                              {language === "rw" ? "Genzura & Andika (Manage & Record)" : "Manage & Record"}
                            </span>
                          </div>
                          {permission === "manage" && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-2 leading-relaxed">
                          {language === "rw"
                            ? "Ashobora kwandika ibikorwa by'ubuhinzi (kuhira, kubagara, gutera imiti), gusuzuma indwara, no kuvugurura imikurire y'ibihingwa."
                            : "Can log daily activities, record crop diagnoses, update plant growth stage, and log field observations."}
                        </p>
                      </button>

                      {/* View Only Option */}
                      <button
                        type="button"
                        onClick={() => setPermission("view")}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          permission === "view"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 shadow-xs"
                            : "bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 hover:border-emerald-400"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-lg bg-stone-600 text-white flex items-center justify-center">
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-stone-900 dark:text-white text-xs">
                              {language === "rw" ? "Reba Gusa (View Only)" : "View Only (Read-Only)"}
                            </span>
                          </div>
                          {permission === "view" && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-2 leading-relaxed">
                          {language === "rw"
                            ? "Areba gusa amakuru y'umurima, ibyatewe, iteganyagihe n'amasomo. Ntiyemerewe guhindura cyangwa gusiba ibintu."
                            : "Can view crop records, weather and parcel health. Cannot delete, edit finances, or modify parcel configurations."}
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs"
                    >
                      {t.cancel}
                    </button>

                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-sm transition-all active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {language === "rw"
                          ? "Ohereza Ubutumire (Create Parcel Invitation)"
                          : "Send Parcel Invitation"}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* TAB 2: ACTIVE TEAM MEMBERS & PERMISSIONS */}
          {activeTab === "members" && (
            <div className="space-y-4">
              {/* Selected QR Pass Popup View if any */}
              {selectedQrMember && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex flex-col sm:flex-row items-center gap-4">
                  {qrCodeDataUrl && (
                    <div className="p-2 bg-white rounded-xl border border-emerald-200 shrink-0">
                      <img src={qrCodeDataUrl} alt="Member QR" className="w-28 h-28 object-contain" />
                    </div>
                  )}
                  <div className="space-y-1.5 flex-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start space-x-2">
                      <span className="font-black text-emerald-950 dark:text-white text-sm">
                        {selectedQrMember.name}
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        ({selectedQrMember.inviteCode})
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300">
                      {language === "rw"
                        ? "Ereka uyu mukoresha iyi QR code akoreshe kamera ya telefone ye ahabwe uburenganzira ako kanya."
                        : "Show this QR code to the agronomist or worker to scan and open on their phone."}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(getInviteUrl(selectedQrMember.inviteCode));
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? "Copied" : "Copy Link"}</span>
                      </button>
                      <button
                        onClick={() => setSelectedQrMember(null)}
                        className="px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold"
                      >
                        {language === "rw" ? "Bireke" : "Close QR"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-3">
                {teamMembers.map((member) => {
                  const roleMeta = getRoleLabel(member.role);
                  const permMeta = getPermissionLabel(member.permission);
                  const assignedFarmsText = getAssignedFarmsText(member.assignedFarmIds);

                  return (
                    <div
                      key={member.id}
                      className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Member Identity */}
                        <div className="flex items-start space-x-3">
                          <img
                            src={
                              member.avatarUrl ||
                              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
                            }
                            alt={member.name}
                            className="w-11 h-11 rounded-full border-2 border-emerald-500 object-cover shrink-0"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                                {member.name}
                              </h4>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center space-x-1 ${roleMeta.badge}`}
                              >
                                {roleMeta.icon}
                                <span>{language === "rw" ? roleMeta.rw : roleMeta.en}</span>
                              </span>
                              {member.status === "pending_invitation" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  Pending Invite
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  Active
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                              {member.specialization || "Farm Collaborator"}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                              <span className="flex items-center space-x-1 font-mono">
                                <Phone className="w-3 h-3 text-emerald-600" />
                                <span>{member.phone}</span>
                              </span>
                              {member.email && (
                                <span className="flex items-center space-x-1">
                                  <Mail className="w-3 h-3 text-stone-400" />
                                  <span>{member.email}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Permission & Status Controls */}
                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                          <button
                            onClick={() =>
                              onUpdateTeamMember(member.id, {
                                permission: member.permission === "manage" ? "view" : "manage",
                              })
                            }
                            title="Click to toggle between View Only and Manage"
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${permMeta.badge}`}
                          >
                            {permMeta.icon}
                            <span>{language === "rw" ? permMeta.rw : permMeta.en}</span>
                          </button>

                          <button
                            onClick={() => setSelectedQrMember(member)}
                            title="View QR Code"
                            className="p-1.5 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-700 dark:text-stone-200"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {onSimulateMemberLogin && (
                            <button
                              onClick={() => {
                                onSimulateMemberLogin(member);
                                onClose();
                              }}
                              title="Simulate what this member sees"
                              className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs flex items-center space-x-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span className="hidden md:inline">Simulate</span>
                            </button>
                          )}

                          <button
                            onClick={() => onDeleteTeamMember(member.id)}
                            title="Revoke access"
                            className="p-1.5 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-rose-100 hover:text-rose-600 text-stone-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Assigned Farm Parcels Strip */}
                      <div className="pt-2 border-t border-stone-200 dark:border-stone-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-stone-600 dark:text-stone-300">
                            {language === "rw" ? "Imirima ashinzwe:" : "Assigned Parcels:"}
                          </span>
                          <span className="font-bold text-emerald-800 dark:text-emerald-300">
                            {assignedFarmsText}
                          </span>
                        </div>

                        {member.notes && (
                          <div className="text-[11px] text-stone-500 italic truncate max-w-xs">
                            "{member.notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-100 dark:bg-stone-800/80 p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs shrink-0">
          <div className="text-stone-500 dark:text-stone-400 flex items-center space-x-1.5">
            <Info className="w-4 h-4 text-emerald-600" />
            <span>
              {language === "rw"
                ? "Abakozi bahawe uburenganzira babona gusa imirima bashinzwe."
                : "Invited workers & agronomists only see the parcels assigned to them."}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs"
          >
            {language === "rw" ? "Bifunze" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};
