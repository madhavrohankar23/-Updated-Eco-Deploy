import React, { useState, useEffect } from "react";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  GraduationCap,
  Briefcase,
  Store,
  Building2,
  Heart,
  Home,
  Compass,
  Footprints,
  Bike,
  Car,
  Fuel,
  Zap,
  Clock,
  Sun,
  Sunset,
  Moon,
  Repeat,
  Leaf,
  IndianRupee,
  TrendingDown,
  TrainFront,
  Bus,
  Calendar,
  AlertCircle,
  Target,
  Pencil,
  Lock,
  User,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  saveCommuterProfile,
  getCommuterProfile,
  fetchCommuterProfile,
  type CommuterProfileData,
} from "../services/commuterProfileService";

interface CommuterUserProfileInfo {
  fullName?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  tier?: string | undefined;
}

interface CommuterOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userProfile?: CommuterUserProfileInfo | undefined;
  initialMode?: "wizard" | "details" | undefined;
  onCompleted?: (data: CommuterProfileData) => void;
}

// ─── Popular Nagpur Hubs (15-20 Curated Hubs) ────────────────────────────────
export const NAGPUR_COMMUTE_HUBS = [
  { id: "sitabuldi", name: "Sitabuldi Interchange", zone: "Central Hub", icon: "🚇" },
  { id: "zero_mile", name: "Zero Mile Freedom Park", zone: "Central Nagpur", icon: "📍" },
  { id: "mihan", name: "MIHAN & SEZ (TCS / Infosys)", zone: "South Corridor", icon: "🏢" },
  { id: "dharampeth", name: "Dharampeth & WHC Road", zone: "West Nagpur", icon: "🛍️" },
  { id: "vnit", name: "VNIT & Bajaj Nagar", zone: "South-West", icon: "🎓" },
  { id: "it_park", name: "IT Park (Gayatri Nagar)", zone: "South Ambazari", icon: "💻" },
  { id: "sadar", name: "Sadar & Residency Road", zone: "North-Central", icon: "🍽️" },
  { id: "hingna", name: "Hingna MIDC Industrial Zone", zone: "South-West MIDC", icon: "🏭" },
  { id: "rcoem", name: "Ramdeobaba University / Katol Rd", zone: "North-West", icon: "🏛️" },
  { id: "mahal", name: "Mahal & Gandhibagh", zone: "East Heritage", icon: "🏰" },
  { id: "itwari", name: "Itwari & Sarafa Bazaar", zone: "East Trade Hub", icon: "🪙" },
  { id: "airport", name: "Dr. Ambedkar Airport (MIHAN)", zone: "Wardha Road", icon: "✈️" },
  { id: "railway_station", name: "Nagpur Main Railway Station", zone: "Central Railway", icon: "🚆" },
  { id: "futala", name: "Futala Waterfront & Promenade", zone: "West Nagpur", icon: "🌊" },
  { id: "ambazari", name: "Ambazari Lake & Bio Park", zone: "South-West", icon: "🌳" },
  { id: "koradi", name: "Koradi Temple & Power Plant", zone: "North Nagpur", icon: "🛕" },
  { id: "medical_sq", name: "GMC Hospital & Medical Square", zone: "South-Central", icon: "🏥" },
  { id: "aiims", name: "AIIMS Nagpur Campus", zone: "MIHAN Corridor", icon: "🩺" },
  { id: "butibori", name: "Butibori Industrial Estate", zone: "Outer South", icon: "🏭" },
  { id: "pardi", name: "Prajapati Nagar & Pardi", zone: "East Metro Terminal", icon: "🚇" },
];

export default function CommuterOnboardingModal({
  isOpen,
  onClose,
  userId,
  userProfile,
  initialMode = "details",
  onCompleted,
}: CommuterOnboardingModalProps) {
  // Mode: "wizard" (step-by-step 1-by-1 questionnaire) OR "details" (overview with sections & edit pen icons)
  const [viewMode, setViewMode] = useState<"wizard" | "details">(initialMode);

  // Wizard Step: 0 to 7 (8 Questions total) + 8 (Completion celebration screen)
  const [currentStep, setCurrentStep] = useState<number>(0);
  const totalSteps = 8;

  // Active section currently enabled for editing in "details" mode (null = all fields disabled by default)
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string>("");

  // Answers State
  const [occupation, setOccupation] = useState<string>("");
  const [commuteDistance, setCommuteDistance] = useState<string>("");
  const [vehicleOwned, setVehicleOwned] = useState<string>("");
  const [vehicleModelYear, setVehicleModelYear] = useState<string>("");
  const [transitFrequency, setTransitFrequency] = useState<{
    metro: string;
    bus: string;
    auto: string;
  }>({
    metro: "",
    bus: "",
    auto: "",
  });
  const [frequentHubs, setFrequentHubs] = useState<string[]>([]);
  const [dailyTravelTime, setDailyTravelTime] = useState<string>("");
  const [commutePriority, setCommutePriority] = useState<string>("");
  const [monthlyExpense, setMonthlyExpense] = useState<string>("");

  const [hubWarning, setHubWarning] = useState<string>("");

  const applyProfileData = (data: CommuterProfileData) => {
    if (data.occupation) setOccupation(data.occupation);
    if (data.commuteDistance) setCommuteDistance(data.commuteDistance);
    if (data.vehicleOwned) setVehicleOwned(data.vehicleOwned);
    if (data.vehicleModelYear) setVehicleModelYear(data.vehicleModelYear);
    if (data.transitFrequency) {
      setTransitFrequency({
        metro: data.transitFrequency.metro || "",
        bus: data.transitFrequency.bus || "",
        auto: data.transitFrequency.auto || "",
      });
    }
    if (data.frequentHubs) setFrequentHubs(data.frequentHubs);
    if (data.dailyTravelTime) setDailyTravelTime(data.dailyTravelTime);
    if (data.commutePriority) setCommutePriority(data.commutePriority);
    if (data.monthlyExpense) setMonthlyExpense(data.monthlyExpense);
  };

  // Load existing profile on mount or when modal opens (instant local cache + Supabase sync)
  useEffect(() => {
    if (isOpen && userId) {
      // 1. Instant optimistic load from local storage
      const existing = getCommuterProfile(userId);
      if (existing) {
        applyProfileData(existing);
      }
      // 2. Fetch fresh user-specific details directly from Supabase Cloud
      void fetchCommuterProfile(userId).then((cloud) => {
        if (cloud) {
          applyProfileData(cloud);
        }
      });
      setViewMode(initialMode);
      setEditingSection(null);
    }
  }, [isOpen, userId, initialMode]);

  if (!isOpen) return null;

  // Check if current wizard step has an answer selected
  const hasSelectedCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return Boolean(occupation);
      case 1:
        return Boolean(commuteDistance);
      case 2:
        return Boolean(vehicleOwned);
      case 3:
        return Boolean(transitFrequency.metro || transitFrequency.bus || transitFrequency.auto);
      case 4:
        return frequentHubs.length > 0;
      case 5:
        return Boolean(dailyTravelTime);
      case 6:
        return Boolean(commutePriority);
      case 7:
        return Boolean(monthlyExpense);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      saveProfileAndFinish(true);
    }
  };

  const handleSkipQuestion = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      saveProfileAndFinish(true);
    }
  };

  const handleSkipEntireSetup = () => {
    void saveCommuterProfile(userId, {}, true);
    onClose();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const toggleHub = (hubId: string) => {
    setHubWarning("");
    if (frequentHubs.includes(hubId)) {
      setFrequentHubs((prev) => prev.filter((id) => id !== hubId));
    } else {
      if (frequentHubs.length >= 6) {
        setHubWarning("You can select up to 6 frequent hubs in Nagpur. Uncheck one to add another.");
        return;
      }
      setFrequentHubs((prev) => [...prev, hubId]);
    }
  };

  const saveProfileAndFinish = (andCloseModal = true) => {
    const data: CommuterProfileData = {
      occupation,
      commuteDistance,
      vehicleOwned,
      vehicleModelYear: vehicleOwned === "none" ? undefined : (vehicleModelYear || undefined),
      transitFrequency,
      frequentHubs,
      dailyTravelTime,
      commutePriority,
      monthlyExpense,
    };

    void saveCommuterProfile(userId, data, false);
    if (onCompleted) {
      onCompleted(data);
    }
    if (andCloseModal) {
      onClose();
    }
  };

  const handleSaveInlineSection = (sectionIndex: number) => {
    saveProfileAndFinish(false);
    setEditingSection(null);
    setSaveSuccessNotice("Preference updated successfully!");
    setTimeout(() => setSaveSuccessNotice(""), 3000);
  };

  const handleCancelInlineSection = () => {
    if (userId) {
      const existing = getCommuterProfile(userId);
      if (existing) {
        if (existing.occupation) setOccupation(existing.occupation);
        if (existing.commuteDistance) setCommuteDistance(existing.commuteDistance);
        if (existing.vehicleOwned) setVehicleOwned(existing.vehicleOwned);
        if (existing.vehicleModelYear) setVehicleModelYear(existing.vehicleModelYear);
        if (existing.transitFrequency) {
          setTransitFrequency({
            metro: existing.transitFrequency.metro || "",
            bus: existing.transitFrequency.bus || "",
            auto: existing.transitFrequency.auto || "",
          });
        }
        if (existing.frequentHubs) setFrequentHubs(existing.frequentHubs);
        if (existing.dailyTravelTime) setDailyTravelTime(existing.dailyTravelTime);
        if (existing.commutePriority) setCommutePriority(existing.commutePriority);
        if (existing.monthlyExpense) setMonthlyExpense(existing.monthlyExpense);
      }
    }
    setEditingSection(null);
  };

  // Step Progress Calculation
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);

  // Category Badge Title for Wizard
  const getCategoryBadge = () => {
    switch (currentStep) {
      case 0:
        return "YOUR ROLE";
      case 1:
        return "COMMUTE DISTANCE";
      case 2:
        return "VEHICLE OWNED";
      case 3:
        return "TRANSIT HABITS";
      case 4:
        return "FREQUENT HUBS";
      case 5:
        return "TRAVEL TIMINGS";
      case 6:
        return "TRANSIT PRIORITIES";
      case 7:
        return "MONTHLY BUDGET";
      default:
        return "COMPLETED";
    }
  };

  // Helper Formatters for the "details" view
  const getOccupationDisplay = () => {
    switch (occupation) {
      case "student":
        return { title: "Student", desc: "College or university student" };
      case "working_professional":
        return { title: "Working Professional", desc: "Private company, IT park or corporate" };
      case "business_owner":
        return { title: "Business Owner", desc: "Shop owner, trader or self-employed" };
      case "govt_public_sector":
        return { title: "Government / Public Sector Employee", desc: "Government office, PSU or public services" };
      case "healthcare":  
        return { title: "Healthcare or Essential Services", desc: "Doctor, nurse, hospital staff or essential worker" };
      case "homemaker":
        return { title: "Homemaker", desc: "Home management, family errands" };
      case "visitor_explorer":
        return { title: "Visitor / Explorer", desc: "Visiting Nagpur or exploring the city" };
      default:
        return { title: "Not specified", desc: "Click edit to choose your daily occupation" };
    }
  };

  const getDistanceDisplay = () => {
    switch (commuteDistance) {
      case "under_5km":
        return "Under 5 km (Short / Neighborhood commute)";
      case "5_15km":
        return "5 to 15 km (Standard City commute)";
      case "15_30km":
        return "15 to 30 km (Long Corridor)";
      case "over_30km":
        return "30+ km (Greater Region / Suburbs)";
      default:
        return "Not specified";
    }
  };

  const getVehicleDisplay = () => {
    let typeName = "None / Public Transit Only";
    if (vehicleOwned === "petrol_2w") typeName = "Two-Wheeler (Petrol Bike/Activa)";
    else if (vehicleOwned === "ev_2w") typeName = "Electric Scooter";
    else if (vehicleOwned === "car_ice") typeName = "Four-Wheeler (Petrol / Diesel Car)";
    else if (vehicleOwned === "car_ev") typeName = "Electric Car (EV)";
    else if (!vehicleOwned) return "Not specified";

    if (vehicleOwned && vehicleOwned !== "none" && vehicleModelYear) {
      let yrLabel = vehicleModelYear.replace("_", " ");
      if (vehicleModelYear === "before_2012") yrLabel = "Before 2012 (BS-III)";
      else if (vehicleModelYear === "2012_2017") yrLabel = "2012–2017 (BS-IV)";
      else if (vehicleModelYear === "2018_2021") yrLabel = "2018–2021 (BS-VI)";
      else if (vehicleModelYear === "2022_plus") yrLabel = "2022–2026 (Modern EV)";
      return `${typeName} • Registration: ${yrLabel}`;
    }
    return typeName;
  };

  const getTravelTimeDisplay = () => {
    switch (dailyTravelTime) {
      case "morning_peak":
        return "Morning Peak Hours (7:30 AM – 10:30 AM)";
      case "midday":
        return "Midday / Afternoon (11:00 AM – 3:30 PM)";
      case "evening_peak":
        return "Evening Peak Hours (4:30 PM – 8:30 PM)";
      case "late_night":
        return "Late Evening & Night (After 8:30 PM)";
      case "flexible":
        return "Flexible / Varied Hours";
      default:
        return "Not specified";
    }
  };

  const getPriorityDisplay = () => {
    switch (commutePriority) {
      case "fastest":
        return "⚡ Fastest Travel Time (Minimum delays & quick arrival)";
      case "budget":
        return "💰 Save Commute Expenses (Budget-friendly public transit)";
      case "eco":
        return "🌿 Reduce Carbon Footprint & Pollution (Clean air priority)";
      case "comfort_least_walk":
        return "🚶 Least Walking & Easy Transfers (Maximum physical comfort)";
      default:
        return "Not specified";
    }
  };

  const getExpenseDisplay = () => {
    switch (monthlyExpense) {
      case "under_1000":
        return "Under ₹1,000 / month (Minimal commute expense)";
      case "1000_2500":
        return "₹1,000 – ₹2,500 / month (Moderate commute)";
      case "2500_5000":
        return "₹2,500 – ₹5,000 / month (Substantial expense)";
      case "over_5000":
        return "Over ₹5,000 / month (High private vehicle expense)";
      default:
        return "Not specified";
    }
  };

  const userName = userProfile?.fullName || "Nagpur Commuter";
  const userEmail = userProfile?.email || "No email registered";
  const userPhone = userProfile?.phone || "No contact linked";
  const userTier = userProfile?.tier || "🌱 Eco Tier Commuter";

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/75 p-2 sm:p-4 md:p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex w-full max-w-5xl max-h-[94vh] flex-col overflow-hidden rounded-[26px] sm:rounded-[30px] border border-slate-200/90 bg-white shadow-2xl shadow-black/40 dark:border-slate-800 dark:bg-slate-950">
        
        {/* ── 1. Top Header Bar (Full Width) ── */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 sm:px-7 py-3.5 dark:border-slate-800 dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#059669] text-white shadow-sm shadow-emerald-700/20">
              <Bus className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Commuter Profile Setup
                </h2>
                {viewMode === "details" && (
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[#059669] dark:text-emerald-400 font-extrabold text-[10px] px-2 py-0.5">
                    Profile Saved
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {viewMode === "details"
                  ? "Manage your account details and commute preferences"
                  : "Help us understand your travel needs"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === "details" ? (
              <button
                type="button"
                onClick={() => {
                  setViewMode("wizard");
                  setCurrentStep(0);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                title="Retake full 8-step survey"
              >
                <RotateCcw className="size-3.5 text-[#059669]" />
                <span>Retake Full Survey</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSkipEntireSetup}
                className="rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
              >
                Skip for now
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200 cursor-pointer"
              title="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* ── 2. Modal Body (Two-Column Layout: Left Side Image Banner + Right Content) ── */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          
          {/* ══════════════════════════════════════════════════════════════════════
              LEFT COLUMN: Side Image & Theme Banner (Visible on all views)
          ══════════════════════════════════════════════════════════════════════ */}
          <aside className="w-full md:w-[330px] lg:w-[350px] shrink-0 bg-[#edf8f4] dark:bg-[#062c1d]/90 border-r border-[#d8ebdf] dark:border-emerald-950/80 flex flex-col justify-between overflow-hidden">
            
            {/* Top Text with padding */}
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-2xl sm:text-[26px] font-black leading-tight text-slate-900 dark:text-white tracking-tight">
                Let’s personalize <br />
                your <span className="text-[#059669] dark:text-emerald-400">commute</span>
              </h2>
              <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                Tell us a bit about yourself so we can show the most relevant routes, alerts and features for Nagpur.
              </p>
            </div>

            {/* Middle Illustration — TOUCHES THE BORDERS of the box! */}
            <div className="w-full relative select-none">
              <img
                src="/images/commute_onboarding_bus.png"
                alt="Nagpur Transit Bus"
                className="w-full h-auto block object-cover select-none"
                loading="eager"
              />
            </div>

            {/* Bottom Floating Card — SLIGHTLY HOVERS / OVERLAPS over bottom of image */}
            <div className="relative z-10 mx-5 mb-5 -mt-8 sm:-mt-10 rounded-2xl border border-white/80 bg-white/95 p-4 shadow-md shadow-emerald-950/10 backdrop-blur-sm dark:bg-slate-900/95 dark:border-emerald-900/40">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-[#059669] dark:bg-emerald-950 dark:text-emerald-400">
                  <Target className="size-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Your profile helps us
                </span>
              </div>
              <div className="space-y-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="flex size-4 items-center justify-center rounded-full bg-[#059669] text-white shrink-0">
                    <Check className="size-2.5 stroke-[3]" />
                  </div>
                  <span>Suggest better routes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex size-4 items-center justify-center rounded-full bg-[#059669] text-white shrink-0">
                    <Check className="size-2.5 stroke-[3]" />
                  </div>
                  <span>Show relevant alerts</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex size-4 items-center justify-center rounded-full bg-[#059669] text-white shrink-0">
                    <Check className="size-2.5 stroke-[3]" />
                  </div>
                  <span>Personalize recommendations</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex size-4 items-center justify-center rounded-full bg-[#059669] text-white shrink-0">
                    <Check className="size-2.5 stroke-[3]" />
                  </div>
                  <span>Improve your overall experience</span>
                </div>
              </div>
            </div>

          </aside>

          {/* ══════════════════════════════════════════════════════════════════════
              RIGHT COLUMN: Main Content Area
              Toggles between "details" (Section-wise with pen icons) and "wizard" (1-by-1)
          ══════════════════════════════════════════════════════════════════════ */}
          <main className="flex-1 flex flex-col justify-between bg-white dark:bg-slate-950 overflow-hidden min-h-0">
            
            {/* ── MODE 1: DETAILS & SECTION-WISE PROFILE VIEW (WITH PEN ICONS) ── */}
            {viewMode === "details" && (
              <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-5 space-y-6">
                
                {saveSuccessNotice && (
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 animate-in fade-in">
                    <CheckCircle2 className="size-4 text-[#059669]" />
                    <span>{saveSuccessNotice}</span>
                  </div>
                )}

                {/* ── SECTION 1: PERSONAL DETAILS (NON-EDITABLE) ── */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <User className="size-3.5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Personal Details
                      </h3>
                    </div>
                  </div>

                  {/* Non-editable personal info grid (Disabled by default) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Field 1: Name */}
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/70 p-3.5 space-y-1 select-none cursor-not-allowed shadow-2xs opacity-90">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Full Name
                      </span>
                      <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                          {userName}
                        </p>
                        <Lock className="size-3 text-slate-400 shrink-0" />
                      </div>
                    </div>

                    {/* Field 2: Email */}
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/70 p-3.5 space-y-1 select-none cursor-not-allowed shadow-2xs opacity-90">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Email Address
                      </span>
                      <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                          {userEmail}
                        </p>
                        <Lock className="size-3 text-slate-400 shrink-0" />
                      </div>
                    </div>

                    {/* Field 3: Contact */}
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/70 p-3.5 space-y-1 select-none cursor-not-allowed shadow-2xs opacity-90">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Contact / Mobile
                      </span>
                      <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                          {userPhone}
                        </p>
                        <Lock className="size-3 text-slate-400 shrink-0" />
                      </div>
                    </div>

                    {/* Field 4: Account Tier */}
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/70 p-3.5 space-y-1 select-none cursor-not-allowed shadow-2xs opacity-90">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Nagpur Transit Tier
                      </span>
                      <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-bold text-[#059669] dark:text-emerald-400 truncate">
                          {userTier}
                        </p>
                        <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── SECTION 2: COMMUTE PREFERENCES & SURVEY DETAILS (DISABLED BY DEFAULT, PEN ICON ENABLES) ── */}
                <section className="space-y-3.5 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-[#059669] dark:bg-emerald-950 dark:text-emerald-400">
                        <Compass className="size-3.5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Commute Preferences & Transit Survey
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Press <Pencil className="inline size-3 text-[#059669] mx-0.5" /> to edit any field
                    </span>
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      QUESTION 1: Persona / Occupation
                  ────────────────────────────────────────────────────────────── */}
                  <div
                    className={`rounded-2xl border p-4 transition-all ${
                      editingSection === 1
                        ? "border-[#059669] bg-[#f8fdfa] dark:bg-emerald-950/20 shadow-sm ring-1 ring-[#059669]/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#059669] dark:bg-emerald-950 dark:text-emerald-400">
                          <GraduationCap className="size-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            1. Commuter Persona / Occupation
                          </p>
                          <p className="text-xs font-semibold text-[#059669] dark:text-emerald-400 mt-0.5">
                            {getOccupationDisplay().title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {getOccupationDisplay().desc}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingSection(editingSection === 1 ? null : 1)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer border ${
                          editingSection === 1
                            ? "border-[#059669] bg-[#059669] text-white shadow-xs"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                        title="Edit question"
                      >
                        <Pencil className="size-3" />
                        <span>{editingSection === 1 ? "Editing" : "Edit"}</span>
                      </button>
                    </div>

                    {/* Enabled Choices on Pen Click */}
                    {editingSection === 1 && (
                      <div className="mt-4 pt-4 border-t border-emerald-100 dark:border-emerald-900/50 space-y-3 animate-in fade-in duration-200">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Choose your daily role:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            { id: "student", label: "Student", desc: "College or university student" },
                            { id: "working_professional", label: "Working Professional", desc: "Private company, IT park or corporate" },
                            { id: "business_owner", label: "Business Owner", desc: "Shop owner, trader or self-employed" },
                            { id: "govt_public_sector", label: "Government / Public Sector", desc: "Government office, PSU, public services" },
                            { id: "healthcare", label: "Healthcare / Essential Staff", desc: "Doctor, nurse, hospital worker" },
                            { id: "homemaker", label: "Homemaker", desc: "Home management, family errands" },
                            { id: "visitor_explorer", label: "Visitor / Explorer", desc: "Visiting Nagpur or exploring" },
                          ].map((role) => (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => setOccupation(role.id)}
                              className={`rounded-xl border p-2.5 text-left text-xs transition cursor-pointer ${
                                occupation === role.id
                                  ? "border-[#059669] bg-[#059669] text-white font-bold"
                                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                              }`}
                            >
                              <p className="font-bold">{role.label}</p>
                              <p className={`text-[10px] mt-0.5 ${occupation === role.id ? "text-emerald-100" : "text-slate-500 dark:text-slate-400"}`}>
                                {role.desc}
                              </p>
                            </button>
                          ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleCancelInlineSection}
                            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveInlineSection(1)}
                            className="rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold px-4 py-1.5 transition cursor-pointer shadow-xs"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      QUESTION 2: Daily Commute Distance
                  ────────────────────────────────────────────────────────────── */}
                  <div
                    className={`rounded-2xl border p-4 transition-all ${
                      editingSection === 2
                        ? "border-[#059669] bg-[#f8fdfa] dark:bg-emerald-950/20 shadow-sm ring-1 ring-[#059669]/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                          <Footprints className="size-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            2. Daily Commute Distance
                          </p>
                          <p className="text-xs font-semibold text-[#059669] dark:text-emerald-400 mt-0.5">
                            {getDistanceDisplay()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingSection(editingSection === 2 ? null : 2)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer border ${
                          editingSection === 2
                            ? "border-[#059669] bg-[#059669] text-white shadow-xs"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                        title="Edit question"
                      >
                        <Pencil className="size-3" />
                        <span>{editingSection === 2 ? "Editing" : "Edit"}</span>
                      </button>
                    </div>

                    {editingSection === 2 && (
                      <div className="mt-4 pt-4 border-t border-emerald-100 dark:border-emerald-900/50 space-y-3 animate-in fade-in duration-200">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Select one-way distance:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: "under_5km", label: "Under 5 km" },
                            { id: "5_15km", label: "5 to 15 km" },
                            { id: "15_30km", label: "15 to 30 km" },
                            { id: "over_30km", label: "30+ km" },
                          ].map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => setCommuteDistance(d.id)}
                              className={`rounded-xl border p-2 text-center text-xs font-bold transition cursor-pointer ${
                                commuteDistance === d.id
                                  ? "border-[#059669] bg-[#059669] text-white"
                                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleCancelInlineSection}
                            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveInlineSection(2)}
                            className="rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold px-4 py-1.5 transition cursor-pointer shadow-xs"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      QUESTION 3: Vehicle Owned & Model Year
                  ────────────────────────────────────────────────────────────── */}
                  <div
                    className={`rounded-2xl border p-4 transition-all ${
                      editingSection === 3
                        ? "border-[#059669] bg-[#f8fdfa] dark:bg-emerald-950/20 shadow-sm ring-1 ring-[#059669]/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                          <Car className="size-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            3. Personal Vehicle Owned & Model Year
                          </p>
                          <p className="text-xs font-semibold text-[#059669] dark:text-emerald-400 mt-0.5">
                            {getVehicleDisplay()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingSection(editingSection === 3 ? null : 3)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer border ${
                          editingSection === 3
                            ? "border-[#059669] bg-[#059669] text-white shadow-xs"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                        title="Edit question"
                      >
                        <Pencil className="size-3" />
                        <span>{editingSection === 3 ? "Editing" : "Edit"}</span>
                      </button>
                    </div>

                    {editingSection === 3 && (
                      <div className="mt-4 pt-4 border-t border-emerald-100 dark:border-emerald-900/50 space-y-3 animate-in fade-in duration-200">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Choose vehicle owned:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            { id: "none", label: "None / Public Transit Only" },
                            { id: "petrol_2w", label: "Two-Wheeler (Petrol Bike/Activa)" },
                            { id: "ev_2w", label: "Electric Scooter" },
                            { id: "car_ice", label: "Four-Wheeler (Petrol / Diesel)" },
                            { id: "car_ev", label: "Electric Car (EV)" },
                          ].map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => {
                                setVehicleOwned(v.id);
                                if (v.id === "none") setVehicleModelYear("");
                              }}
                              className={`rounded-xl border p-2.5 text-left text-xs font-bold transition cursor-pointer ${
                                vehicleOwned === v.id
                                  ? "border-[#059669] bg-[#059669] text-white"
                                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                              }`}
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>

                        {vehicleOwned && vehicleOwned !== "none" && (
                          <div className="pt-2 space-y-1.5">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Vehicle Model Year:
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {[
                                { id: "before_2012", label: "Before 2012" },
                                { id: "2012_2017", label: "2012 – 2017" },
                                { id: "2018_2021", label: "2018 – 2021" },
                                { id: "2022_plus", label: "2022 – 2026" },
                              ].map((yr) => (
                                <button
                                  key={yr.id}
                                  type="button"
                                  onClick={() => setVehicleModelYear(yr.id)}
                                  className={`rounded-xl border p-2 text-center text-xs font-semibold transition cursor-pointer ${
                                    vehicleModelYear === yr.id
                                      ? "border-[#059669] bg-[#059669] text-white font-bold"
                                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                                  }`}
                                >
                                  {yr.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleCancelInlineSection}
                            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveInlineSection(3)}
                            className="rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold px-4 py-1.5 transition cursor-pointer shadow-xs"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      QUESTION 4: Current Transit Frequency
                  ────────────────────────────────────────────────────────────── */}
                  <div
                    className={`rounded-2xl border p-4 transition-all ${
                      editingSection === 4
                        ? "border-[#059669] bg-[#f8fdfa] dark:bg-emerald-950/20 shadow-sm ring-1 ring-[#059669]/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                          <TrainFront className="size-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            4. Current Transit Frequency
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              🚇 Metro: {transitFrequency.metro ? transitFrequency.metro.replace("_", " ") : "Not set"}
                            </span>
                            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              🚌 Bus: {transitFrequency.bus ? transitFrequency.bus.replace("_", " ") : "Not set"}
                            </span>
                            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              🛺 Auto: {transitFrequency.auto ? transitFrequency.auto.replace("_", " ") : "Not set"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingSection(editingSection === 4 ? null : 4)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer border ${
                          editingSection === 4
                            ? "border-[#059669] bg-[#059669] text-white shadow-xs"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                        title="Edit question"
                      >
                        <Pencil className="size-3" />
                        <span>{editingSection === 4 ? "Editing" : "Edit"}</span>
                      </button>
                    </div>

                    {editingSection === 4 && (
                      <div className="mt-4 pt-4 border-t border-emerald-100 dark:border-emerald-900/50 space-y-3 animate-in fade-in duration-200">
                        {[
                          { key: "metro" as const, name: "Maha Metro" },
                          { key: "bus" as const, name: "Aapli Bus" },
                          { key: "auto" as const, name: "Auto Rickshaw" },
                        ].map((m) => (
                          <div key={m.key} className="space-y-1">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {m.name}:
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              {["daily", "few_times_week", "occasionally", "rarely_never"].map((freq) => (
                                <button
                                  key={freq}
                                  type="button"
                                  onClick={() =>
                                    setTransitFrequency((prev) => ({ ...prev, [m.key]: freq }))
                                  }
                                  className={`rounded-xl border p-1.5 text-center text-xs capitalize transition cursor-pointer ${
                                    transitFrequency[m.key] === freq
                                      ? "border-[#059669] bg-[#059669] text-white font-bold"
                                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                                  }`}
                                >
                                  {freq.replace(/_/g, " ")}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleCancelInlineSection}
                            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveInlineSection(4)}
                            className="rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold px-4 py-1.5 transition cursor-pointer shadow-xs"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      QUESTION 5: Frequent Hubs in Nagpur
                  ────────────────────────────────────────────────────────────── */}
                  <div
                    className={`rounded-2xl border p-4 transition-all ${
                      editingSection === 5
                        ? "border-[#059669] bg-[#f8fdfa] dark:bg-emerald-950/20 shadow-sm ring-1 ring-[#059669]/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                          <Compass className="size-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            5. Frequent Hubs in Nagpur ({frequentHubs.length} / 6 selected)
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {frequentHubs.length > 0 ? (
                              frequentHubs.map((hId) => {
                                const found = NAGPUR_COMMUTE_HUBS.find((h) => h.id === hId);
                                return (
                                  <span
                                    key={hId}
                                    className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-bold text-[#059669] dark:text-emerald-300"
                                  >
                                    {found ? `${found.icon} ${found.name}` : hId}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-xs text-slate-400">No hubs selected</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingSection(editingSection === 5 ? null : 5)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer border ${
                          editingSection === 5
                            ? "border-[#059669] bg-[#059669] text-white shadow-xs"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                        title="Edit question"
                      >
                        <Pencil className="size-3" />
                        <span>{editingSection === 5 ? "Editing" : "Edit"}</span>
                      </button>
                    </div>

                    {editingSection === 5 && (
                      <div className="mt-4 pt-4 border-t border-emerald-100 dark:border-emerald-900/50 space-y-3 animate-in fade-in duration-200">
                        {hubWarning && (
                          <p className="text-xs font-bold text-amber-600">{hubWarning}</p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                          {NAGPUR_COMMUTE_HUBS.map((hub) => {
                            const isChecked = frequentHubs.includes(hub.id);
                            return (
                              <button
                                key={hub.id}
                                type="button"
                                onClick={() => toggleHub(hub.id)}
                                className={`flex items-center justify-between rounded-xl border p-2 text-left text-xs transition cursor-pointer ${
                                  isChecked
                                    ? "border-[#059669] bg-[#059669] text-white font-bold"
                                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                                }`}
                              >
                                <span>{hub.icon} {hub.name}</span>
                                {isChecked && <Check className="size-3 stroke-[3]" />}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleCancelInlineSection}
                            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveInlineSection(5)}
                            className="rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold px-4 py-1.5 transition cursor-pointer shadow-xs"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      QUESTION 6: Primary Daily Travel Time
                  ────────────────────────────────────────────────────────────── */}
                  <div
                    className={`rounded-2xl border p-4 transition-all ${
                      editingSection === 6
                        ? "border-[#059669] bg-[#f8fdfa] dark:bg-emerald-950/20 shadow-sm ring-1 ring-[#059669]/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                          <Sun className="size-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            6. Primary Daily Travel Time
                          </p>
                          <p className="text-xs font-semibold text-[#059669] dark:text-emerald-400 mt-0.5">
                            {getTravelTimeDisplay()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingSection(editingSection === 6 ? null : 6)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer border ${
                          editingSection === 6
                            ? "border-[#059669] bg-[#059669] text-white shadow-xs"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                        title="Edit question"
                      >
                        <Pencil className="size-3" />
                        <span>{editingSection === 6 ? "Editing" : "Edit"}</span>
                      </button>
                    </div>

                    {editingSection === 6 && (
                      <div className="mt-4 pt-4 border-t border-emerald-100 dark:border-emerald-900/50 space-y-3 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            { id: "morning_peak", label: "Morning Peak (7:30 – 10:30 AM)" },
                            { id: "midday", label: "Midday (11:00 AM – 3:30 PM)" },
                            { id: "evening_peak", label: "Evening Peak (4:30 – 8:30 PM)" },
                            { id: "late_night", label: "Late Evening & Night (After 8:30 PM)" },
                            { id: "flexible", label: "Flexible / Varied Hours" },
                          ].map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setDailyTravelTime(t.id)}
                              className={`rounded-xl border p-2 text-left text-xs font-bold transition cursor-pointer ${
                                dailyTravelTime === t.id
                                  ? "border-[#059669] bg-[#059669] text-white"
                                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleCancelInlineSection}
                            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveInlineSection(6)}
                            className="rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold px-4 py-1.5 transition cursor-pointer shadow-xs"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      QUESTION 7: What Matters Most to You
                  ────────────────────────────────────────────────────────────── */}
                  <div
                    className={`rounded-2xl border p-4 transition-all ${
                      editingSection === 7
                        ? "border-[#059669] bg-[#f8fdfa] dark:bg-emerald-950/20 shadow-sm ring-1 ring-[#059669]/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
                          <Zap className="size-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            7. What Matters Most in Commute
                          </p>
                          <p className="text-xs font-semibold text-[#059669] dark:text-emerald-400 mt-0.5">
                            {getPriorityDisplay()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingSection(editingSection === 7 ? null : 7)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer border ${
                          editingSection === 7
                            ? "border-[#059669] bg-[#059669] text-white shadow-xs"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                        title="Edit question"
                      >
                        <Pencil className="size-3" />
                        <span>{editingSection === 7 ? "Editing" : "Edit"}</span>
                      </button>
                    </div>

                    {editingSection === 7 && (
                      <div className="mt-4 pt-4 border-t border-emerald-100 dark:border-emerald-900/50 space-y-3 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            { id: "fastest", label: "Fastest Travel Time (Speed Priority)" },
                            { id: "budget", label: "Save Commute Expenses (Cost Priority)" },
                            { id: "eco", label: "Reduce Carbon & Pollution (Green Priority)" },
                            { id: "comfort_least_walk", label: "Least Walking (Comfort Priority)" },
                          ].map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setCommutePriority(p.id)}
                              className={`rounded-xl border p-2 text-left text-xs font-bold transition cursor-pointer ${
                                commutePriority === p.id
                                  ? "border-[#059669] bg-[#059669] text-white"
                                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleCancelInlineSection}
                            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveInlineSection(7)}
                            className="rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold px-4 py-1.5 transition cursor-pointer shadow-xs"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      QUESTION 8: Approximate Monthly Fuel / Commute Expense
                  ────────────────────────────────────────────────────────────── */}
                  <div
                    className={`rounded-2xl border p-4 transition-all ${
                      editingSection === 8
                        ? "border-[#059669] bg-[#f8fdfa] dark:bg-emerald-950/20 shadow-sm ring-1 ring-[#059669]/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#059669] dark:bg-emerald-950 dark:text-emerald-400">
                          <IndianRupee className="size-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            8. Approximate Monthly Expense
                          </p>
                          <p className="text-xs font-semibold text-[#059669] dark:text-emerald-400 mt-0.5">
                            {getExpenseDisplay()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingSection(editingSection === 8 ? null : 8)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer border ${
                          editingSection === 8
                            ? "border-[#059669] bg-[#059669] text-white shadow-xs"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                        title="Edit question"
                      >
                        <Pencil className="size-3" />
                        <span>{editingSection === 8 ? "Editing" : "Edit"}</span>
                      </button>
                    </div>

                    {editingSection === 8 && (
                      <div className="mt-4 pt-4 border-t border-emerald-100 dark:border-emerald-900/50 space-y-3 animate-in fade-in duration-200">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: "under_1000", label: "Under ₹1,000" },
                            { id: "1000_2500", label: "₹1,000 – ₹2,500" },
                            { id: "2500_5000", label: "₹2,500 – ₹5,000" },
                            { id: "over_5000", label: "Over ₹5,000" },
                          ].map((exp) => (
                            <button
                              key={exp.id}
                              type="button"
                              onClick={() => setMonthlyExpense(exp.id)}
                              className={`rounded-xl border p-2 text-center text-xs font-bold transition cursor-pointer ${
                                monthlyExpense === exp.id
                                  ? "border-[#059669] bg-[#059669] text-white"
                                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                              }`}
                            >
                              {exp.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleCancelInlineSection}
                            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveInlineSection(8)}
                            className="rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold px-4 py-1.5 transition cursor-pointer shadow-xs"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </section>

              </div>
            )}

            {/* ── MODE 2: STEP-BY-STEP QUESTIONNAIRE WIZARD (1-BY-1 CARDS) ── */}
            {viewMode === "wizard" && (
              <>
                {/* Top Progress Track */}
                {currentStep < totalSteps && (
                  <div className="px-6 sm:px-8 pt-5 pb-1">
                    <div className="flex items-center justify-end gap-3 text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1.5">
                      <span>Step {currentStep + 1} of {totalSteps}</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{progressPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#059669] transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Scrollable Question Content Area */}
                <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-3 sm:py-4 space-y-4">
                  {currentStep < totalSteps && (
                    <span className="inline-block rounded-lg bg-[#e6f4ea] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#059669] dark:bg-emerald-950/70 dark:text-emerald-400">
                      {getCategoryBadge()}
                    </span>
                  )}

                  {/* STEP 1: Persona */}
                  {currentStep === 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                          What best describes you?
                        </h3>
                        <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          This helps us tailor routes, schedules and updates for your daily travel in Nagpur.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {[
                          { id: "student", title: "Student", desc: "College or university student", icon: GraduationCap, iconBg: "bg-emerald-100 text-[#059669]" },
                          { id: "working_professional", title: "Working Professional", desc: "Private company, IT park or corporate", icon: Briefcase, iconBg: "bg-blue-100 text-blue-600" },
                          { id: "business_owner", title: "Business Owner", desc: "Shop owner, trader or self-employed", icon: Store, iconBg: "bg-amber-100 text-amber-600" },
                          { id: "govt_public_sector", title: "Government / Public Sector Employee", desc: "Government office, PSU or public services", icon: Building2, iconBg: "bg-purple-100 text-purple-600" },
                          { id: "healthcare", title: "Healthcare or Essential Services", desc: "Doctor, nurse, hospital staff or essential worker", icon: Heart, iconBg: "bg-rose-100 text-rose-600" },
                          { id: "homemaker", title: "Homemaker", desc: "Home management, family errands", icon: Home, iconBg: "bg-orange-100 text-orange-600" },
                          { id: "visitor_explorer", title: "Visitor / Explorer", desc: "I’m visiting Nagpur or exploring the city", icon: Compass, iconBg: "bg-slate-100 text-slate-600" },
                        ].map((item) => {
                          const Icon = item.icon;
                          const isSelected = occupation === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setOccupation(item.id)}
                              className={`flex items-start gap-3 rounded-2xl border p-3.5 sm:p-4 text-left transition-all cursor-pointer ${
                                isSelected
                                  ? "border-[#059669] bg-[#f0faf5] dark:bg-emerald-950/30 dark:border-emerald-500 shadow-xs ring-1 ring-[#059669]/20"
                                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/60"
                              }`}
                            >
                              <div className={`flex size-11 shrink-0 items-center justify-center rounded-full transition ${isSelected ? "bg-emerald-100 text-[#059669]" : item.iconBg}`}>
                                <Icon className="size-5" />
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                                  {isSelected && (
                                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#059669] text-white">
                                      <Check className="size-3 stroke-[3]" />
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{item.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Distance */}
                  {currentStep === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                          What is your daily travel distance?
                        </h3>
                        <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          Helps us compute accurate travel time, fuel comparisons, and carbon offsets for Nagpur.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {[
                          { id: "under_5km", title: "Under 5 km", badge: "Short Commute", desc: "Walking, cycling, or quick short-hop transit", icon: Footprints, iconBg: "bg-emerald-100 text-[#059669]" },
                          { id: "5_15km", title: "5 to 15 km", badge: "Standard City Commute", desc: "E.g., Sitabuldi ↔ Dharampeth / Sadar / VNIT", icon: Bike, iconBg: "bg-blue-100 text-blue-600" },
                          { id: "15_30km", title: "15 to 30 km", badge: "Long Corridor", desc: "E.g., Automotive Sq ↔ Khapri / MIHAN / Hingna", icon: TrainFront, iconBg: "bg-purple-100 text-purple-600" },
                          { id: "over_30km", title: "30+ km", badge: "Greater Region / Suburbs", desc: "Butibori, Koradi, Kamptee, Outer Ring Road", icon: Car, iconBg: "bg-amber-100 text-amber-600" },
                        ].map((item) => {
                          const Icon = item.icon;
                          const isSelected = commuteDistance === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setCommuteDistance(item.id)}
                              className={`flex items-start gap-3 rounded-2xl border p-3.5 sm:p-4 text-left transition-all cursor-pointer ${
                                isSelected
                                  ? "border-[#059669] bg-[#f0faf5] dark:bg-emerald-950/30 dark:border-emerald-500 shadow-xs ring-1 ring-[#059669]/20"
                                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/60"
                              }`}
                            >
                              <div className={`flex size-11 shrink-0 items-center justify-center rounded-full transition ${isSelected ? "bg-emerald-100 text-[#059669]" : item.iconBg}`}>
                                <Icon className="size-5" />
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                                  {isSelected && (
                                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#059669] text-white">
                                      <Check className="size-3 stroke-[3]" />
                                    </div>
                                  )}
                                </div>
                                <span className="inline-block rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
                                  {item.badge}
                                </span>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Vehicle Owned & Model Year */}
                  {currentStep === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                          Do you own a personal vehicle?
                        </h3>
                        <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          Used to calculate personal fuel savings and emissions.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          1. Vehicle Type Owned
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {[
                            { id: "none", title: "None / Public Transit Only", desc: "I walk, ride metro/bus, or use auto", icon: Bus, iconBg: "bg-emerald-100 text-[#059669]" },
                            { id: "petrol_2w", title: "Two-Wheeler (Petrol)", desc: "Bike / Activa / Petrol Scooter", icon: Bike, iconBg: "bg-blue-100 text-blue-600" },
                            { id: "ev_2w", title: "Electric Scooter", desc: "Ola, Ather, Chetak, TVS iQube, etc.", icon: Zap, iconBg: "bg-teal-100 text-teal-600" },
                            { id: "car_ice", title: "Four-Wheeler (Petrol / Diesel)", desc: "Personal car, hatchback, or SUV", icon: Car, iconBg: "bg-purple-100 text-purple-600" },
                            { id: "car_ev", title: "Electric Car (EV)", desc: "Tata Nexon EV, Tiago EV, MG, etc.", icon: Zap, iconBg: "bg-emerald-100 text-[#059669]" },
                          ].map((item) => {
                            const Icon = item.icon;
                            const isSelected = vehicleOwned === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setVehicleOwned(item.id);
                                  if (item.id === "none") setVehicleModelYear("");
                                }}
                                className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? "border-[#059669] bg-[#f0faf5] dark:bg-emerald-950/30 dark:border-emerald-500 shadow-xs ring-1 ring-[#059669]/20"
                                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/60"
                                }`}
                              >
                                <div className={`flex size-10 shrink-0 items-center justify-center rounded-full transition ${isSelected ? "bg-emerald-100 text-[#059669]" : item.iconBg}`}>
                                  <Icon className="size-4.5" />
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                                    {isSelected && (
                                      <div className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-[#059669] text-white">
                                        <Check className="size-2.5 stroke-[3]" />
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{item.desc}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div
                        className={`rounded-2xl border p-4 transition-all duration-300 ${
                          vehicleOwned && vehicleOwned !== "none"
                            ? "border-emerald-200 bg-[#f4faf6] dark:border-emerald-900/40 dark:bg-emerald-950/20"
                            : "border-slate-200/60 bg-slate-50/60 opacity-50 pointer-events-none"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Calendar className="size-4 text-[#059669]" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            2. Vehicle Model / Registration Year
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-3">
                          Vehicle year establishes emission standard and tailpipe efficiency.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: "before_2012", label: "Before 2012", sub: "Legacy (BS-III)" },
                            { id: "2012_2017", label: "2012 – 2017", sub: "BS-IV Standard" },
                            { id: "2018_2021", label: "2018 – 2021", sub: "BS-VI Transition" },
                            { id: "2022_plus", label: "2022 – 2026", sub: "Modern / Latest EV" },
                          ].map((yr) => {
                            const isSelected = vehicleModelYear === yr.id;
                            return (
                              <button
                                key={yr.id}
                                type="button"
                                disabled={!vehicleOwned || vehicleOwned === "none"}
                                onClick={() => setVehicleModelYear(yr.id)}
                                className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all cursor-pointer ${
                                  isSelected
                                    ? "border-[#059669] bg-[#059669] text-white font-bold shadow-xs"
                                    : "border-slate-200 bg-white hover:border-emerald-400 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                                }`}
                              >
                                <span className="text-xs font-bold">{yr.label}</span>
                                <span className={`text-[9px] mt-0.5 ${isSelected ? "text-emerald-100" : "text-slate-400"}`}>
                                  {yr.sub}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Transit Frequency */}
                  {currentStep === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                          How frequently do you use Nagpur transit?
                        </h3>
                        <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          Select how often you currently ride each public transport mode in Nagpur.
                        </p>
                      </div>

                      <div className="space-y-3 pt-1">
                        {[
                          { key: "metro" as const, modeName: "Maha Metro Nagpur", subtitle: "Orange & Aqua line network", icon: TrainFront, iconBg: "bg-orange-100 text-orange-600" },
                          { key: "bus" as const, modeName: "Aapli Bus (NMC Transit)", subtitle: "800+ city bus routes & feeders", icon: Bus, iconBg: "bg-emerald-100 text-[#059669]" },
                          { key: "auto" as const, modeName: "Auto Rickshaw / Shared Cab", subtitle: "First & last mile road travel", icon: Repeat, iconBg: "bg-amber-100 text-amber-600" },
                        ].map((mode) => {
                          const Icon = mode.icon;
                          const activeValue = transitFrequency[mode.key];
                          return (
                            <div key={mode.key} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs space-y-2.5">
                              <div className="flex items-center gap-3">
                                <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${mode.iconBg}`}>
                                  <Icon className="size-4.5" />
                                </div>
                                <div>
                                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{mode.modeName}</p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{mode.subtitle}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                {[
                                  { id: "daily", label: "Daily" },
                                  { id: "few_times_week", label: "2–3x / week" },
                                  { id: "occasionally", label: "Occasionally" },
                                  { id: "rarely_never", label: "Rarely / Never" },
                                ].map((freq) => {
                                  const isFreqSelected = activeValue === freq.id;
                                  return (
                                    <button
                                      key={freq.id}
                                      type="button"
                                      onClick={() => setTransitFrequency((prev) => ({ ...prev, [mode.key]: freq.id }))}
                                      className={`rounded-xl px-2.5 py-2 text-xs font-semibold transition-all cursor-pointer border ${
                                        isFreqSelected
                                          ? "border-[#059669] bg-[#059669] text-white font-bold shadow-2xs"
                                          : "border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                                      }`}
                                    >
                                      {freq.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 5: Frequent Hubs */}
                  {currentStep === 4 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Which hubs or destinations in Nagpur do you travel to most often?
                          </h3>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black shrink-0 ${
                          frequentHubs.length === 6
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-emerald-100 text-[#059669]"
                        }`}>
                          Selected: {frequentHubs.length} / 6 max
                        </span>
                      </div>

                      {hubWarning && (
                        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs font-semibold text-amber-800 animate-in fade-in">
                          <AlertCircle className="size-4 shrink-0 text-amber-600" />
                          <span>{hubWarning}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[310px] overflow-y-auto pr-1">
                        {NAGPUR_COMMUTE_HUBS.map((hub) => {
                          const isChecked = frequentHubs.includes(hub.id);
                          const isMaxReached = frequentHubs.length >= 6 && !isChecked;
                          return (
                            <button
                              key={hub.id}
                              type="button"
                              disabled={isMaxReached}
                              onClick={() => toggleHub(hub.id)}
                              className={`flex items-center justify-between rounded-2xl border p-2.5 sm:p-3 text-left transition-all cursor-pointer ${
                                isChecked
                                  ? "border-[#059669] bg-[#f0faf5] dark:bg-emerald-950/30 dark:border-emerald-500 shadow-2xs ring-1 ring-[#059669]/20"
                                  : isMaxReached
                                  ? "border-slate-200/40 bg-slate-50/40 opacity-40 cursor-not-allowed"
                                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-lg shrink-0">{hub.icon}</span>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{hub.name}</p>
                                  <p className="text-[10px] text-slate-500 truncate">{hub.zone}</p>
                                </div>
                              </div>
                              <div className={`flex size-5 shrink-0 items-center justify-center rounded-lg border transition ${
                                isChecked ? "border-[#059669] bg-[#059669] text-white" : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800"
                              }`}>
                                {isChecked && <Check className="size-3 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 6: Travel Timings */}
                  {currentStep === 5 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                          When do you typically travel during the day?
                        </h3>
                        <p className="text-xs sm:text-[13px] text-slate-500 mt-1 leading-relaxed">
                          Helps us provide timely route notifications and Nagpur Metro/bus headway updates.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {[
                          { id: "morning_peak", title: "Morning Peak Hours", timeWindow: "7:30 AM – 10:30 AM", desc: "School, college, office rush hours", icon: Sun, iconBg: "bg-amber-100 text-amber-600" },
                          { id: "midday", title: "Midday / Afternoon", timeWindow: "11:00 AM – 3:30 PM", desc: "Off-peak travel, shopping, appointments", icon: Clock, iconBg: "bg-sky-100 text-sky-600" },
                          { id: "evening_peak", title: "Evening Peak Hours", timeWindow: "4:30 PM – 8:30 PM", desc: "Return commute, college wrap-up", icon: Sunset, iconBg: "bg-orange-100 text-orange-600" },
                          { id: "late_night", title: "Late Evening & Night", timeWindow: "After 8:30 PM", desc: "Night shifts, dinner, late connectivity", icon: Moon, iconBg: "bg-indigo-100 text-indigo-600" },
                          { id: "flexible", title: "Flexible / Varied Hours", timeWindow: "Multiple times throughout day", desc: "Freelancers, business owners", icon: Repeat, iconBg: "bg-emerald-100 text-[#059669]" },
                        ].map((item) => {
                          const Icon = item.icon;
                          const isSelected = dailyTravelTime === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setDailyTravelTime(item.id)}
                              className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                                isSelected
                                  ? "border-[#059669] bg-[#f0faf5] dark:bg-emerald-950/30 dark:border-emerald-500 shadow-xs ring-1 ring-[#059669]/20"
                                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900"
                              }`}
                            >
                              <div className={`flex size-11 shrink-0 items-center justify-center rounded-full transition ${isSelected ? "bg-emerald-100 text-[#059669]" : item.iconBg}`}>
                                <Icon className="size-5" />
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                                  {isSelected && (
                                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#059669] text-white">
                                      <Check className="size-3 stroke-[3]" />
                                    </div>
                                  )}
                                </div>
                                <span className="inline-block font-mono text-[10px] font-bold text-[#059669] mt-0.5">{item.timeWindow}</span>
                                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 7: Priority */}
                  {currentStep === 6 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                          What matters most to you in your commute?
                        </h3>
                        <p className="text-xs sm:text-[13px] text-slate-500 mt-1 leading-relaxed">
                          We'll use this to prioritize and recommend your best routes across Nagpur.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {[
                          { id: "fastest", title: "Fastest Travel Time", badge: "Speed Priority", desc: "Minimum delays, prompt transit connections", icon: Zap, iconBg: "bg-amber-100 text-amber-600" },
                          { id: "budget", title: "Save Commute Expenses", badge: "Cost Priority", desc: "Budget-friendly travel, affordable bus/metro fares", icon: IndianRupee, iconBg: "bg-emerald-100 text-[#059669]" },
                          { id: "eco", title: "Reduce Carbon Footprint & Pollution", badge: "Green Priority", desc: "Cleaner air for Nagpur, lower emissions", icon: Leaf, iconBg: "bg-teal-100 text-teal-600" },
                          { id: "comfort_least_walk", title: "Least Walking & Easy Transfers", badge: "Comfort Priority", desc: "Minimum physical strain, effortless interchanges", icon: Footprints, iconBg: "bg-blue-100 text-blue-600" },
                        ].map((item) => {
                          const Icon = item.icon;
                          const isSelected = commutePriority === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setCommutePriority(item.id)}
                              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                                isSelected
                                  ? "border-[#059669] bg-[#f0faf5] dark:bg-emerald-950/30 dark:border-emerald-500 shadow-xs ring-1 ring-[#059669]/20"
                                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900"
                              }`}
                            >
                              <div className={`flex size-11 shrink-0 items-center justify-center rounded-full transition ${isSelected ? "bg-emerald-100 text-[#059669]" : item.iconBg}`}>
                                <Icon className="size-5" />
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                                  {isSelected && (
                                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#059669] text-white">
                                      <Check className="size-3 stroke-[3]" />
                                    </div>
                                  )}
                                </div>
                                <span className="inline-block rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 mt-1">{item.badge}</span>
                                <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 8: Monthly Budget */}
                  {currentStep === 7 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                          Approximate monthly commute / fuel expense?
                        </h3>
                        <p className="text-xs sm:text-[13px] text-slate-500 mt-1 leading-relaxed">
                          Helps our Green Rewards engine compute your money savings when switching to public transit.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {[
                          { id: "under_1000", title: "Under ₹1,000 / month", badge: "Minimal Expense", desc: "Walking, cycling, or infrequent public transit", icon: IndianRupee, iconBg: "bg-emerald-100 text-[#059669]" },
                          { id: "1000_2500", title: "₹1,000 – ₹2,500 / month", badge: "Moderate Commute", desc: "Daily two-wheeler petrol or daily metro passes", icon: IndianRupee, iconBg: "bg-blue-100 text-blue-600" },
                          { id: "2500_5000", title: "₹2,500 – ₹5,000 / month", badge: "Substantial Expense", desc: "Car petrol / diesel, long distance, regular cabs", icon: Fuel, iconBg: "bg-amber-100 text-amber-600" },
                          { id: "over_5000", title: "Over ₹5,000 / month", badge: "High Expense", desc: "Heavy private car usage, outer region travel", icon: TrendingDown, iconBg: "bg-rose-100 text-rose-600" },
                        ].map((item) => {
                          const Icon = item.icon;
                          const isSelected = monthlyExpense === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setMonthlyExpense(item.id)}
                              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                                isSelected
                                  ? "border-[#059669] bg-[#f0faf5] dark:bg-emerald-950/30 dark:border-emerald-500 shadow-xs ring-1 ring-[#059669]/20"
                                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900"
                              }`}
                            >
                              <div className={`flex size-11 shrink-0 items-center justify-center rounded-full transition ${isSelected ? "bg-emerald-100 text-[#059669]" : item.iconBg}`}>
                                <Icon className="size-5" />
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                                  {isSelected && (
                                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#059669] text-white">
                                      <Check className="size-3 stroke-[3]" />
                                    </div>
                                  )}
                                </div>
                                <span className="inline-block rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 mt-1">{item.badge}</span>
                                <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 9: Wizard Completion Screen */}
                  {currentStep === totalSteps && (
                    <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
                      <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-[#059669] text-white shadow-xl shadow-emerald-700/25">
                        <Check className="size-8 stroke-[3]" />
                      </div>

                      <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                          You're All Set for Eco-Move Nagpur! 🚀
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                          Your personalized commuter persona has been configured. We've customized your routes, schedules, and carbon savings profile.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left pt-2">
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 p-3">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Persona</span>
                          <p className="text-xs font-bold text-slate-900 dark:text-white capitalize mt-0.5 truncate">
                            {occupation ? occupation.replace("_", " ") : "Commuter"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 p-3">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Vehicle</span>
                          <p className="text-xs font-bold text-slate-900 dark:text-white capitalize mt-0.5 truncate">
                            {vehicleOwned ? vehicleOwned.replace("_", " ") : "Transit"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 p-3">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Key Hubs</span>
                          <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                            {frequentHubs.length} Selected
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 p-3">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Priority</span>
                          <p className="text-xs font-bold text-[#059669] capitalize mt-0.5 truncate">
                            {commutePriority || "Fastest"}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => setViewMode("details")}
                          className="flex-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-3 px-4 text-xs font-bold text-slate-700 transition cursor-pointer"
                        >
                          View Full Profile Details
                        </button>
                        <button
                          type="button"
                          onClick={() => saveProfileAndFinish(true)}
                          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#059669] hover:bg-[#047857] py-3 px-6 text-sm font-bold text-white shadow-lg shadow-emerald-700/20 active:scale-[0.99] transition cursor-pointer"
                        >
                          <span>Explore Nagpur Transit Map</span>
                          <ArrowRight className="size-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Controls Bar for Wizard Mode */}
                {currentStep < totalSteps && (
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-6 sm:px-8 py-4 bg-white dark:bg-slate-950 shrink-0">
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={currentStep === 0}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ArrowLeft className="size-4" />
                      <span>Back</span>
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSkipQuestion}
                        className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition px-2 py-1 cursor-pointer"
                      >
                        Skip for now
                      </button>

                      <button
                        type="button"
                        onClick={handleNext}
                        className="flex items-center gap-1.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs sm:text-sm font-semibold px-6 py-2.5 shadow-sm transition active:scale-95 cursor-pointer"
                      >
                        <span>{currentStep === totalSteps - 1 ? "Finish" : "Next"}</span>
                        <ArrowRight className="size-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Bottom Controls Bar for Details Mode */}
            {viewMode === "details" && (
              <div className="flex items-center justify-end border-t border-slate-100 dark:border-slate-800 px-6 sm:px-8 py-3.5 bg-white dark:bg-slate-950 shrink-0">
                <button
                  type="button"
                  onClick={() => saveProfileAndFinish(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs sm:text-sm font-semibold px-6 py-2 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <span>Done</span>
                  <Check className="size-4" />
                </button>
              </div>
            )}

          </main>

        </div>

      </div>
    </div>
  );
}
