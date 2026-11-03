import React, { useState, useEffect } from 'react';
import { 
  X, 
  Award, 
  Sparkles, 
  User, 
  Users, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Send, 
  HelpCircle,
  Undo2,
  FileText,
  Search,
  Phone,
  Lock,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Eye,
  RefreshCw,
  KeyRound
} from 'lucide-react';
import { formatPhoneNumber, cleanPhoneNumber } from '../utils/phoneFormatter';

export default function ContestJudgeModal({
  isOpen,
  onClose,
  attendees = [],
  teams = [],
  existingVotes = [],
  onSaveVotes,
  initialJudgeName = ""
}) {
  // -----------------------------------------------------------------------------------------
  // 1. ALL HOOKS MUST BE DECLARED UNCONDITIONALLY AT THE VERY TOP
  // -----------------------------------------------------------------------------------------

  // Unique Judge Session ID
  const [judgeId] = useState(() => {
    try {
      let saved = localStorage.getItem("sme_fan_judge_id_v1");
      if (!saved) {
        saved = "judge_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
        localStorage.setItem("sme_fan_judge_id_v1", saved);
      }
      return saved;
    } catch (e) {
      return "judge_" + Date.now();
    }
  });

  // Verified Judge Identity State
  const [verifiedJudge, setVerifiedJudge] = useState(() => {
    try {
      const saved = sessionStorage.getItem("sme_fan_verified_judge_v1") || localStorage.getItem("sme_fan_verified_judge_v1");
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return (parsed && parsed.name) ? parsed : null;
    } catch (e) {
      return null;
    }
  });

  // Verification Gate Form State
  const [judgeSearchQuery, setJudgeSearchQuery] = useState("");
  const [selectedCandidateForVerify, setSelectedCandidateForVerify] = useState(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);

  // Main Category Tab: 'individual' | 'team'
  const [judgeTab, setJudgeTab] = useState('individual');

  // Search filter for candidates in the 2 columns
  const [searchQuery, setSearchQuery] = useState("");

  // Scores structure:
  // {
  //   individual: {
  //     beauty: { [ticketNo]: score (1..5) },
  //     creativity: { [ticketNo]: score (1..5) }
  //   },
  //   team: {
  //     beauty: { [teamId]: score (1..5) },
  //     creativity: { [teamId]: score (1..5) }
  //   }
  // }
  const [scores, setScores] = useState(() => {
    try {
      const saved = localStorage.getItem("sme_fan_judge_scores_v1");
      return saved ? JSON.parse(saved) : {
        individual: { beauty: {}, creativity: {} },
        team: { beauty: {}, creativity: {} }
      };
    } catch (e) {
      return {
        individual: { beauty: {}, creativity: {} },
        team: { beauty: {}, creativity: {} }
      };
    }
  });

  // Reason for Change Modal state
  const [pendingScoreChange, setPendingScoreChange] = useState(null);
  const [changeReasonInput, setChangeReasonInput] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);

  // Sync scores draft to localStorage (only if active voting)
  useEffect(() => {
    if (isReadOnlyMode) return;
    try {
      localStorage.setItem("sme_fan_judge_scores_v1", JSON.stringify(scores));
    } catch (e) {}
  }, [scores, isReadOnlyMode]);

  // Auto-submit on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (isReadOnlyMode || !verifiedJudge) {
          onClose();
        } else {
          handleFinalizeVotes(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, scores, verifiedJudge, auditLogs, judgeId, isReadOnlyMode]);

  // -----------------------------------------------------------------------------------------
  // 2. NOW SAFE TO CONDITIONALLY RETURN IF NOT OPEN (ALL HOOKS HAVE BEEN EXECUTED)
  // -----------------------------------------------------------------------------------------
  if (!isOpen) return null;

  // -----------------------------------------------------------------------------------------
  // 3. HELPERS & COMPUTED VALUES
  // -----------------------------------------------------------------------------------------

  // Effective teams fallback to localStorage if not provided or empty
  const effectiveTeams = (teams && teams.length > 0) ? teams : (() => {
    try {
      localStorage.removeItem("sme_fan_contest_teams_v1");
      const saved = localStorage.getItem("sme_fan_contest_teams_v2");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  })();

  // Helper: Retrieve all submitted votes to check duplicate voting
  const getAllSubmittedVotes = () => {
    try {
      if (existingVotes && existingVotes.length > 0) return existingVotes;
      localStorage.removeItem("sme_fan_contest_all_votes_v1");
      const saved = localStorage.getItem("sme_fan_contest_all_votes_v2");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  };

  // Helper: Find existing vote for a specific registered attendee
  const findExistingVoteForJudge = (attendee) => {
    if (!attendee) return null;
    try {
      const votesList = getAllSubmittedVotes();
      if (!Array.isArray(votesList)) return null;
      const cleanJPhone = cleanPhoneNumber(attendee.phone);
      return votesList.find(v => {
        if (!v) return false;
        const matchTicket = attendee.ticketNo && v.judgeTicketNo && v.judgeTicketNo === attendee.ticketNo;
        const matchPhone = cleanJPhone && v.judgePhone && cleanPhoneNumber(v.judgePhone) === cleanJPhone;
        const matchName = attendee.name && v.judgeName && v.judgeName === attendee.name;
        return matchTicket || matchPhone || matchName;
      });
    } catch (e) {
      return null;
    }
  };

  // Check if verified judge has already voted
  const alreadyVotedRecord = findExistingVoteForJudge(verifiedJudge);

  // Available scores for selection: 5, 4, 3, 2, 1
  const allPoints = [5, 4, 3, 2, 1];

  // Eligible individual candidates: Checked-in attendees
  const eligibleIndividuals = attendees.filter(r => r.checkedIn || true);

  // Filtered lists based on search
  const filteredIndividuals = eligibleIndividuals.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(r.name || '').toLowerCase().includes(q) ||
      String(r.nickname || '').toLowerCase().includes(q) ||
      String(r.ticketNo || '').toLowerCase().includes(q) ||
      String(r.club || '').toLowerCase().includes(q)
    );
  });

  const filteredTeams = effectiveTeams.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = String(t.name || '').toLowerCase().includes(q);
    const matchMembers = t.members?.some(m => 
      String(m.name || '').toLowerCase().includes(q) || 
      String(m.nickname || '').toLowerCase().includes(q) || 
      String(m.ticketNo || '').toLowerCase().includes(q)
    );
    return matchName || matchMembers;
  });

  // Handle Point Assignment with Reason Rule
  const handleAssignScore = (targetId, newPoint, targetAward) => {
    if (isReadOnlyMode) return;

    // Disallow self-voting
    if (judgeTab === 'individual' && verifiedJudge && targetId === verifiedJudge.ticketNo) {
      alert("ท่านคือผู้เข้าประกวดคนนี้ ไม่สามารถให้คะแนนตนเองได้ครับ");
      return;
    }

    if (judgeTab === 'team' && verifiedJudge) {
      const myTeam = effectiveTeams.find(t => t.id === targetId);
      if (myTeam?.members?.some(m => m.ticketNo === verifiedJudge.ticketNo)) {
        alert("ท่านเป็นสมาชิกของทีมนี้ ไม่สามารถให้คะแนนทีมตนเองได้ครับ");
        return;
      }
    }

    const activeCategoryScores = scores[judgeTab]?.[targetAward] || {};
    const currentPoint = activeCategoryScores[targetId];

    // If clearing score
    if (!newPoint || newPoint === currentPoint) {
      setScores(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        if (next[judgeTab]?.[targetAward]) {
          delete next[judgeTab][targetAward][targetId];
        }
        return next;
      });
      return;
    }

    // If changing an already assigned score (and it had a score before)
    if (currentPoint && currentPoint !== newPoint) {
      setPendingScoreChange({
        targetId,
        oldScore: currentPoint,
        newScore: newPoint,
        category: judgeTab,
        award: targetAward
      });
      setChangeReasonInput("");
      return;
    }

    // Direct assignment if new
    setScores(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[judgeTab]) next[judgeTab] = { beauty: {}, creativity: {} };
      if (!next[judgeTab][targetAward]) next[judgeTab][targetAward] = {};

      // If another candidate already had this newPoint in this targetAward, remove from them (exclusive rank)
      Object.keys(next[judgeTab][targetAward]).forEach(k => {
        if (next[judgeTab][targetAward][k] === newPoint) {
          delete next[judgeTab][targetAward][k];
        }
      });
      next[judgeTab][targetAward][targetId] = newPoint;
      return next;
    });
  };

  // Confirm Score Change with Reason
  const handleConfirmScoreChange = () => {
    if (isReadOnlyMode) return;
    if (!pendingScoreChange) return;
    const reasonText = changeReasonInput.trim() || "ปรับอันดับตามเกณฑ์การตัดสินเพิ่มเติม";
    
    setScores(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const { category, award, targetId, newScore } = pendingScoreChange;
      if (!next[category]) next[category] = { beauty: {}, creativity: {} };
      if (!next[category][award]) next[category][award] = {};

      // Clear from any other candidate who had this score in this award
      Object.keys(next[category][award]).forEach(k => {
        if (next[category][award][k] === newScore) {
          delete next[category][award][k];
        }
      });
      next[category][award][targetId] = newScore;
      return next;
    });

    // Record audit reason
    setAuditLogs(prev => [
      ...prev,
      {
        judgeName: verifiedJudge?.name || "กรรมการ",
        category: pendingScoreChange.category,
        award: pendingScoreChange.award === 'beauty' ? 'ความสวยงาม' : 'ความคิดสร้างสรรค์',
        targetId: pendingScoreChange.targetId,
        oldScore: pendingScoreChange.oldScore,
        newScore: pendingScoreChange.newScore,
        reason: reasonText,
        message: `ปรับคะแนน [${pendingScoreChange.award === 'beauty' ? '✨ ความสวยงาม' : '💡 ความคิดสร้างสรรค์'}] จาก ${pendingScoreChange.oldScore} เป็น ${pendingScoreChange.newScore} คะแนน (${reasonText})`,
        timestamp: new Date().toLocaleTimeString("th-TH") + " น."
      }
    ]);

    setPendingScoreChange(null);
    setChangeReasonInput("");
  };

  // Helper: check if any score is placed across categories
  const hasAnyScore = (sc = scores) => {
    if (!sc) return false;
    const indBeauty = Object.values(sc.individual?.beauty || {}).some(v => Number(v) > 0);
    const indCreativity = Object.values(sc.individual?.creativity || {}).some(v => Number(v) > 0);
    const teamBeauty = Object.values(sc.team?.beauty || {}).some(v => Number(v) > 0);
    const teamCreativity = Object.values(sc.team?.creativity || {}).some(v => Number(v) > 0);
    return indBeauty || indCreativity || teamBeauty || teamCreativity;
  };

  // Helper: count total scores given
  const countAssignedScores = (sc = scores) => {
    if (!sc) return 0;
    const b1 = Object.values(sc.individual?.beauty || {}).filter(v => Number(v) > 0).length;
    const c1 = Object.values(sc.individual?.creativity || {}).filter(v => Number(v) > 0).length;
    const b2 = Object.values(sc.team?.beauty || {}).filter(v => Number(v) > 0).length;
    const c2 = Object.values(sc.team?.creativity || {}).filter(v => Number(v) > 0).length;
    return b1 + c1 + b2 + c2;
  };

  // Build the complete vote payload
  const buildVotePayload = (effectiveScores = scores) => {
    const finalJudgeName = verifiedJudge?.name || initialJudgeName || "กรรมการตัดสิน";
    return {
      judgeId,
      judgeTicketNo: verifiedJudge?.ticketNo || "",
      judgePhone: verifiedJudge?.phone || "",
      judgeName: finalJudgeName,
      judgeNickname: verifiedJudge?.nickname || "",
      judgeClub: verifiedJudge?.club || "",
      judgePhoto: verifiedJudge?.photoUrl || verifiedJudge?.costumePhoto || "",
      scores: effectiveScores,
      auditLogs,
      auditTrail: auditLogs,
      submittedAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " น."
    };
  };

  // Submit Final Votes or Auto-Submit on Close
  const handleFinalizeVotes = (isAutoOnClose = false) => {
    if (isReadOnlyMode) {
      onClose();
      return;
    }

    if (!verifiedJudge) {
      onClose();
      return;
    }

    const hasScores = hasAnyScore(scores);

    if (!hasScores) {
      if (!isAutoOnClose) {
        alert("ท่านยังไม่ได้เลือกให้คะแนนผู้เข้าประกวดเลยครับ กรุณากดเลือกคะแนน (5, 4, 3, 2, 1) ก่อนส่งผลคะแนนครับ");
        return;
      }
      onClose();
      return;
    }

    const payload = buildVotePayload(scores);

    if (onSaveVotes) {
      onSaveVotes(payload);
    }

    alert(`บันทึกและส่งผลคะแนนของกรรมการคุณ ${payload.judgeName} เรียบร้อยแล้วครับ! ขอบพระคุณครับ`);
    onClose();
  };

  // Helper function to render each award column
  const renderAwardColumn = (awardKey, awardTitle, icon, theme) => {
    const activeCategoryScores = scores[judgeTab]?.[awardKey] || {};
    const usedPoints = new Set(Object.values(activeCategoryScores).filter(Boolean));
    const isBeauty = awardKey === 'beauty';

    return (
      <div className={`flex flex-col bg-slate-950/70 rounded-3xl border ${theme.border} shadow-xl overflow-hidden`}>
        {/* Column Header */}
        <div className={`p-4 ${theme.headerBg} border-b ${theme.border} space-y-2 shrink-0`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <span className={`p-1.5 rounded-xl ${theme.badgeBg} ${theme.badgeText} shrink-0`}>
                {icon}
              </span>
              <h4 className="font-extrabold text-white text-sm sm:text-base truncate">
                {awardTitle}
              </h4>
            </div>

            {/* Remaining Points Display */}
            <div className="flex items-center space-x-1 shrink-0">
              <span className="text-[10px] text-slate-400 mr-1 hidden sm:inline">แต้มว่าง:</span>
              {allPoints.map(p => {
                const isUsed = usedPoints.has(p);
                return (
                  <span
                    key={p}
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg font-bold font-mono text-[10px] sm:text-xs flex items-center justify-center transition-all ${
                      isUsed 
                        ? 'bg-slate-800 text-slate-600 line-through' 
                        : `${theme.pointActiveBg} text-slate-950 shadow-sm font-black`
                    }`}
                    title={isUsed ? `แต้ม ${p} ถูกมอบให้อันดับอื่นแล้ว` : `แต้ม ${p} ยังว่าง`}
                  >
                    {p}
                  </span>
                );
              })}
            </div>
          </div>
          <p className="text-[11px] text-slate-300">
            {isBeauty 
              ? 'เกณฑ์: ความวิจิตรงดงาม การตัดเย็บ ความสง่างาม และความลงตัวของชุด'
              : 'เกณฑ์: ไอเดียแปลกใหม่ การผสมผสานความคิดสร้างสรรค์ และความโดดเด่นไม่ซ้ำใคร'}
          </p>
        </div>

        {/* Column Candidates List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 max-h-[55vh] min-h-[300px]">
          
          {/* Individual candidates */}
          {judgeTab === 'individual' && (
            <>
              {filteredIndividuals.map((r, idx) => {
                const myScore = activeCategoryScores[r.ticketNo];
                const isSelf = verifiedJudge && r.ticketNo === verifiedJudge.ticketNo;

                return (
                  <div
                    key={r.ticketNo || idx}
                    className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                      myScore
                        ? `${theme.cardActiveBg} ${theme.border} shadow-md`
                        : isSelf
                        ? 'bg-amber-950/20 border-amber-500/30'
                        : 'bg-slate-900/60 border-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* Identity */}
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                        {r.photoUrl || r.costumePhoto ? (
                          <img
                            src={r.photoUrl || r.costumePhoto}
                            alt={r.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <User className="w-5 h-5 opacity-40" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5 truncate">
                        <div className="font-bold text-white text-xs sm:text-sm truncate flex items-center space-x-1">
                          <span className="truncate">{r.name}</span>
                          {r.nickname && (
                            <span className="text-amber-300 font-normal text-[11px] shrink-0">
                              ({r.nickname})
                            </span>
                          )}
                          {isSelf && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold shrink-0">
                              ท่านเอง
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center space-x-1.5 truncate">
                          <span className="font-mono text-amber-300/80">{r.ticketNo}</span>
                          <span>•</span>
                          <span className="truncate">{r.regType === 'member' ? `สมาชิก ${r.club || "สงสพัท"}` : `แขก (${r.club || "ทั่วไป"})`}</span>
                        </div>
                      </div>
                    </div>

                    {/* Points Allocation Buttons (5, 4, 3, 2, 1) */}
                    <div className="flex items-center space-x-1 shrink-0 self-end sm:self-auto">
                      {isSelf ? (
                        <span className="text-[10px] text-amber-400/90 italic bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          (งดออกเสียงตนเอง)
                        </span>
                      ) : (
                        <>
                          {allPoints.map(p => {
                            const isCurrent = myScore === p;
                            const isTakenByOther = !isCurrent && usedPoints.has(p);

                            return (
                              <button
                                key={p}
                                type="button"
                                disabled={isReadOnlyMode || isTakenByOther}
                                onClick={() => handleAssignScore(r.ticketNo, p, awardKey)}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-black font-mono text-xs transition-all flex items-center justify-center ${
                                  isCurrent
                                    ? `${theme.pointActiveBg} text-slate-950 ring-2 ring-white/50 shadow-md scale-105`
                                    : isTakenByOther
                                    ? 'bg-slate-900 text-slate-700 opacity-30 cursor-not-allowed'
                                    : isReadOnlyMode
                                    ? 'bg-slate-900 text-slate-600 opacity-40 cursor-not-allowed'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 hover:border-white/20'
                                }`}
                                title={isReadOnlyMode ? `โหมดอ่านอย่างเดียว (แต้ม ${p})` : isCurrent ? `ให้ ${p} คะแนน (กดเพื่อยกเลิก)` : isTakenByOther ? `คะแนน ${p} ถูกให้กับท่านอื่นแล้ว` : `กดให้ ${p} คะแนน`}
                              >
                                {p}
                              </button>
                            );
                          })}

                          {!isReadOnlyMode && myScore && (
                            <button
                              type="button"
                              onClick={() => handleAssignScore(r.ticketNo, null, awardKey)}
                              className="px-1.5 py-0.5 rounded text-[10px] text-rose-400 hover:bg-rose-500/20 transition-all ml-0.5"
                              title="ยกเลิกคะแนนนี้"
                            >
                              ล้าง
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredIndividuals.length === 0 && (
                <div className="py-12 text-center text-slate-500 text-xs">
                  ไม่พบรายชื่อผู้เข้าประกวดที่ค้นหา
                </div>
              )}
            </>
          )}

          {/* Team candidates */}
          {judgeTab === 'team' && (
            <>
              {filteredTeams.map((t, idx) => {
                const myScore = activeCategoryScores[t.id];
                const isMemberOfThisTeam = verifiedJudge && t.members?.some(m => m.ticketNo === verifiedJudge.ticketNo);

                // Resolve member details with latest photos from attendees
                const teamMembers = (t.members || []).map(m => {
                  const attendeeMatch = attendees.find(a => a.ticketNo === m.ticketNo);
                  return attendeeMatch ? {
                    ...m,
                    name: attendeeMatch.name,
                    nickname: attendeeMatch.nickname,
                    photoUrl: attendeeMatch.photoUrl || attendeeMatch.costumePhoto || m.photoUrl,
                    club: attendeeMatch.club || m.club
                  } : m;
                });

                return (
                  <div
                    key={t.id || idx}
                    className={`p-4 rounded-3xl border transition-all space-y-3 text-xs ${
                      myScore
                        ? `${theme.cardActiveBg} ${theme.border} shadow-lg ring-1 ring-white/10`
                        : isMemberOfThisTeam
                        ? 'bg-amber-950/20 border-amber-500/30'
                        : 'bg-slate-900/70 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Header: Team Name, Member count, and Team Point Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-white/5">
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0" />
                          <h5 className="font-extrabold text-white text-sm sm:text-base truncate">
                            {t.name}
                          </h5>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 shrink-0">
                            สมาชิก {teamMembers.length} คน
                          </span>
                          {isMemberOfThisTeam && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold shrink-0">
                              (ทีมของท่าน)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Points Allocation for the Entire Team */}
                      <div className="flex items-center space-x-1 shrink-0 self-end sm:self-auto">
                        {isMemberOfThisTeam ? (
                          <span className="text-[10px] text-amber-400/90 italic bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/20">
                            (งดออกเสียงทีมตนเอง)
                          </span>
                        ) : (
                          <>
                            <span className="text-[10px] text-slate-400 mr-1 hidden sm:inline">คะแนนทีม:</span>
                            {allPoints.map(p => {
                              const isCurrent = myScore === p;
                              const isTakenByOther = !isCurrent && usedPoints.has(p);

                              return (
                                <button
                                  key={p}
                                  type="button"
                                  disabled={isReadOnlyMode || isTakenByOther}
                                  onClick={() => handleAssignScore(t.id, p, awardKey)}
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-black font-mono text-xs transition-all flex items-center justify-center ${
                                    isCurrent
                                      ? `${theme.pointActiveBg} text-slate-950 ring-2 ring-white/50 shadow-md scale-105`
                                      : isTakenByOther
                                      ? 'bg-slate-900 text-slate-700 opacity-30 cursor-not-allowed'
                                      : isReadOnlyMode
                                      ? 'bg-slate-900 text-slate-600 opacity-40 cursor-not-allowed'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 hover:border-white/20'
                                  }`}
                                  title={isReadOnlyMode ? `โหมดอ่านอย่างเดียว (แต้ม ${p})` : isCurrent ? `ให้ ${p} คะแนนแก่ทีมนี้ (กดเพื่อยกเลิก)` : isTakenByOther ? `คะแนน ${p} ถูกให้กับทีมอื่นแล้ว` : `กดให้ ${p} คะแนนแก่ทีมนี้`}
                                >
                                  {p}
                                </button>
                              );
                            })}

                            {!isReadOnlyMode && myScore && (
                              <button
                                type="button"
                                onClick={() => handleAssignScore(t.id, null, awardKey)}
                                className="px-1.5 py-0.5 rounded text-[10px] text-rose-400 hover:bg-rose-500/20 transition-all ml-0.5"
                                title="ยกเลิกคะแนนนี้"
                              >
                                ล้าง
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Downward Individual Members List with 1:1 Photo */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        <span>รายชื่อสมาชิกในทีม (รูปถ่าย & ชื่อ):</span>
                      </div>

                      <div className="space-y-1.5">
                        {teamMembers.map((m, mIdx) => (
                          <div
                            key={m.ticketNo || mIdx}
                            className="flex items-center space-x-3 p-2 rounded-xl bg-slate-950/80 border border-white/5 hover:border-white/10 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                              {m.photoUrl ? (
                                <img
                                  src={m.photoUrl}
                                  alt={m.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                  <User className="w-5 h-5 opacity-40" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-white text-xs sm:text-sm truncate flex items-center space-x-1">
                                <span className="truncate">{m.name}</span>
                                {m.nickname && (
                                  <span className="text-amber-300 font-normal text-[11px] shrink-0">
                                    ({m.nickname})
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center space-x-1.5 font-mono truncate">
                                <span className="text-amber-400/90">{m.ticketNo}</span>
                                {m.club && <span>• {m.club}</span>}
                              </div>
                            </div>
                          </div>
                        ))}

                        {teamMembers.length === 0 && (
                          <div className="text-[11px] text-slate-500 italic py-1 text-center">
                            ยังไม่มีสมาชิกในทีมนี้
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}

              {filteredTeams.length === 0 && (
                <div className="py-12 text-center text-slate-500 text-xs">
                  {effectiveTeams.length === 0 ? 'ยังไม่มีการสร้างกลุ่ม/ทีมสำหรับการแข่งขัน' : 'ไม่พบกลุ่มที่ค้นหา'}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    );
  };

  // -----------------------------------------------------------------------------------------
  // VIEW 1: IDENTITY VERIFICATION GATE (ค้นหาชื่อกรรมการ + ใส่เบอร์โทรศัพท์ยืนยันตัวตน)
  // -----------------------------------------------------------------------------------------
  if (!verifiedJudge) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/95 backdrop-blur-md overflow-y-auto animate-fadeIn">
        <div className="relative w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-7 text-slate-100 shadow-2xl space-y-5 my-auto">
          
          {/* Modal Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center space-x-3 pb-3 border-b border-white/10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
              <ShieldCheck className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg">
                ยืนยันตัวตนคณะกรรมการตัดสิน
              </h3>
              <p className="text-xs text-amber-300/80">
                ค้นหาชื่อจากการลงทะเบียน & ใส่เบอร์โทรศัพท์ (1 ท่านลงคะแนนได้ 1 ครั้ง)
              </p>
            </div>
          </div>

          {/* Step 1: Search Judge from Registration */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] flex items-center justify-center">1</span>
                <span>ค้นหาชื่อกรรมการตัดสิน (จากการลงทะเบียน)</span>
                <span className="text-rose-400">*</span>
              </span>
              {selectedCandidateForVerify && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCandidateForVerify(null);
                    setJudgeSearchQuery("");
                  }}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  เปลี่ยนชื่อใหม่
                </button>
              )}
            </label>

            {!selectedCandidateForVerify ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อ, เช่น ต, ท, ป หรือเลขที่บัตร..."
                    value={judgeSearchQuery}
                    onChange={(e) => {
                      setJudgeSearchQuery(e.target.value);
                      setVerifyError("");
                    }}
                    autoFocus
                    className="w-full bg-slate-950 border border-white/15 rounded-xl pl-10 pr-8 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  {judgeSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setJudgeSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Suggestions / Search Results list - ONLY when user types something */}
                {!judgeSearchQuery.trim() ? (
                  <div className="py-6 px-4 text-center text-slate-400 text-xs bg-slate-950/40 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center space-y-1.5">
                    <Search className="w-5 h-5 text-amber-400/60" />
                    <span className="text-slate-300 font-medium">พิมพ์ชื่อสมาชิกที่ลงทะเบียนเข้างาน (เช่น ต, ท, ป)</span>
                    <span className="text-[11px] text-slate-500">ระบบจะค้นหาและแสดงรายชื่อให้เลือกทันทีเมื่อเริ่มพิมพ์</span>
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-1 bg-slate-950/90 rounded-2xl p-2 border border-white/5">
                    {(() => {
                      const q = judgeSearchQuery.trim().toLowerCase();
                      const matched = attendees.filter(a => {
                        const name = String(a.name || '').toLowerCase();
                        const nickname = String(a.nickname || '').toLowerCase();
                        const ticketNo = String(a.ticketNo || '').toLowerCase();
                        return name.includes(q) || nickname.includes(q) || ticketNo.includes(q);
                      });

                      if (matched.length === 0) {
                        return (
                          <div className="text-center py-6 text-slate-400 text-xs space-y-1">
                            <div className="text-amber-300 font-medium">ไม่พบรายชื่อที่ตรงกับ "{judgeSearchQuery}"</div>
                            <div className="text-[11px] text-slate-500">กรุณาตรวจสอบการสะกดชื่อ หรือค้นหาด้วยชื่อเล่น / เลขที่บัตร</div>
                          </div>
                        );
                      }

                      return matched.slice(0, 20).map((a, idx) => {
                        const hasVoted = Boolean(findExistingVoteForJudge(a));
                        return (
                          <div
                            key={a.ticketNo || idx}
                            onClick={() => {
                              setSelectedCandidateForVerify(a);
                              setVerifyError("");
                            }}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/80 cursor-pointer border border-transparent hover:border-amber-500/30 transition-all group"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                                {a.photoUrl || a.costumePhoto ? (
                                  <img src={a.photoUrl || a.costumePhoto} alt={a.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                                    <User className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-white text-xs truncate flex items-center space-x-1">
                                  <span className="group-hover:text-amber-300 transition-colors">{a.name}</span>
                                  {a.nickname && <span className="text-amber-300 font-normal">({a.nickname})</span>}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">
                                  <span className="text-amber-400">{a.ticketNo}</span> • {a.club || 'ผู้ร่วมงาน'}
                                </div>
                              </div>
                            </div>

                            {hasVoted ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold shrink-0">
                                🔒 ลงคะแนนแล้ว
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold shrink-0 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                                เลือกท่านนี้
                              </span>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Judge Card */
              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-amber-500/40 shrink-0">
                    {selectedCandidateForVerify.photoUrl || selectedCandidateForVerify.costumePhoto ? (
                      <img src={selectedCandidateForVerify.photoUrl || selectedCandidateForVerify.costumePhoto} alt={selectedCandidateForVerify.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-amber-400">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-extrabold text-white text-sm truncate flex items-center space-x-1.5">
                      <span>คุณ{selectedCandidateForVerify.name}</span>
                      {selectedCandidateForVerify.nickname && (
                        <span className="text-amber-300 font-normal">({selectedCandidateForVerify.nickname})</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-mono truncate">
                      <span className="text-amber-400 font-bold">{selectedCandidateForVerify.ticketNo}</span> • {selectedCandidateForVerify.club || 'ผู้ร่วมงาน'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCandidateForVerify(null);
                      setJudgeSearchQuery("");
                    }}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs"
                  >
                    เปลี่ยน
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Phone Number Verification */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] flex items-center justify-center">2</span>
              <span>ยืนยันตัวตนด้วยเบอร์โทรศัพท์ที่ลงทะเบียน</span>
              <span className="text-rose-400">*</span>
            </label>
            
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400" />
              <input
                type="text"
                placeholder="08x-xxx-xxxx"
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(formatPhoneNumber(e.target.value));
                  setVerifyError("");
                }}
                className="w-full bg-slate-950 border border-white/15 rounded-xl pl-10 pr-3 py-2.5 text-sm sm:text-base text-amber-300 font-mono font-bold tracking-wider placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              📱 กรุณากรอกเบอร์โทรศัพท์มือถือเดียวกับที่ใช้ลงทะเบียน เพื่อความปลอดภัยและยืนยันสิทธิ์
            </p>
          </div>

          {/* Error Banner */}
          {verifyError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{verifyError}</span>
            </div>
          )}

          {/* Submit Verification Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (!selectedCandidateForVerify) {
                  setVerifyError("กรุณาค้นหาและเลือกชื่อกรรมการตัดสินจากการลงทะเบียนในขั้นตอนที่ 1 ก่อนครับ");
                  return;
                }
                if (!phoneInput.trim() || cleanPhoneNumber(phoneInput).length < 9) {
                  setVerifyError("กรุณากรอกเบอร์โทรศัพท์ที่ใช้ลงทะเบียนให้ถูกต้องครบถ้วนครับ");
                  return;
                }

                const cleanEntered = cleanPhoneNumber(phoneInput);
                const cleanReg = cleanPhoneNumber(selectedCandidateForVerify.phone);

                if (cleanEntered !== cleanReg) {
                  setVerifyError("❌ เบอร์โทรศัพท์ไม่ตรงกับข้อมูลที่ลงทะเบียนไว้ กรุณาตรวจสอบเบอร์โทรศัพท์อีกครั้งครับ");
                  return;
                }

                // Check if already voted
                const alreadyVoted = findExistingVoteForJudge(selectedCandidateForVerify);
                if (alreadyVoted) {
                  setVerifiedJudge(selectedCandidateForVerify);
                  setVerifyError("");
                  return;
                }

                // Success!
                setVerifiedJudge(selectedCandidateForVerify);
                try {
                  sessionStorage.setItem("sme_fan_verified_judge_v1", JSON.stringify(selectedCandidateForVerify));
                  localStorage.setItem("sme_fan_verified_judge_v1", JSON.stringify(selectedCandidateForVerify));
                } catch (e) {}
                setVerifyError("");
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              <span>ยืนยันตัวตนเข้าสู่ระบบลงคะแนน</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------------------------
  // VIEW 2: ALREADY VOTED LOCK SCREEN (กรรมการ 1 ท่านลงคะแนนได้ 1 ครั้งเท่านั้น)
  // -----------------------------------------------------------------------------------------
  if (alreadyVotedRecord && !isReadOnlyMode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-fadeIn">
        <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold inline-block">
              ✅ ท่านได้ลงคะแนนการตัดสินเรียบร้อยแล้ว
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold text-white">
              คุณ{verifiedJudge.name} {verifiedJudge.nickname ? `(${verifiedJudge.nickname})` : ''}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              เลขที่บัตร: {verifiedJudge.ticketNo} • {verifiedJudge.club || 'ผู้ร่วมงาน'}
            </p>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 text-xs text-slate-300 space-y-2 text-left">
            <div className="flex items-center justify-between text-slate-400">
              <span>เวลาที่ส่งผลคะแนน:</span>
              <span className="font-mono text-emerald-400 font-bold">{alreadyVotedRecord.submittedAt || '-'}</span>
            </div>
            <p className="text-[11px] text-amber-300/80 border-t border-white/5 pt-2 leading-relaxed">
              ⚠️ <strong>กติกาการตัดสิน:</strong> คณะกรรมการหนึ่งท่านสามารถให้คะแนนการประกวดได้เพียง 1 ครั้งเท่านั้น เพื่อความโปร่งใสและยุติธรรมต่อผู้เข้าประกวดทุกท่าน
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsReadOnlyMode(true);
                if (alreadyVotedRecord.scores) {
                  setScores(alreadyVotedRecord.scores);
                }
              }}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>ดูคะแนนที่ท่านลงไว้ (อ่านอย่างเดียว)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem("sme_fan_verified_judge_v1");
                localStorage.removeItem("sme_fan_verified_judge_v1");
                setVerifiedJudge(null);
                setSelectedCandidateForVerify(null);
                setPhoneInput("");
                setIsReadOnlyMode(false);
              }}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/10"
            >
              เปลี่ยนกรรมการ
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-300 underline"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------------------------
  // VIEW 3: 2-COLUMN SCORING INTERFACE (ACTIVE VOTING OR READ-ONLY REVIEW)
  // -----------------------------------------------------------------------------------------
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleFinalizeVotes(true);
        }
      }}
    >
      <div className="relative w-full max-w-6xl bg-slate-900 border border-amber-500/30 rounded-3xl p-4 sm:p-6 text-slate-100 shadow-2xl space-y-4 my-auto max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
              <Award className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg">
                ระบบให้คะแนนการประกวดแต่งกาย (กรรมการตัดสิน)
              </h3>
              <p className="text-xs text-slate-400">
                รางวัลความสวยงาม และ รางวัลความคิดสร้างสรรค์ (ในหน้าเดียวกัน 2 คอลัมน์)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleFinalizeVotes(true)}
            title="ปิดหน้าต่าง (ระบบส่งคะแนนให้อัตโนมัติทันทีเมื่อมีคะแนน)"
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-Only Notice Banner */}
        {isReadOnlyMode && (
          <div className="bg-amber-500/15 border border-amber-500/30 p-2.5 rounded-2xl flex items-center justify-between text-xs text-amber-300 shrink-0">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                <strong>โหมดดูผลคะแนน (อ่านอย่างเดียว):</strong> ท่านได้ส่งผลคะแนนแล้วเมื่อ {alreadyVotedRecord?.submittedAt || '-'} ไม่สามารถแก้ไขได้
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem("sme_fan_verified_judge_v1");
                localStorage.removeItem("sme_fan_verified_judge_v1");
                setVerifiedJudge(null);
                setSelectedCandidateForVerify(null);
                setPhoneInput("");
                setIsReadOnlyMode(false);
              }}
              className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-bold text-[11px] shrink-0"
            >
              เปลี่ยนกรรมการ
            </button>
          </div>
        )}

        {/* Verified Judge Profile Bar & Search Candidate */}
        <div className="bg-slate-950 p-3 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          
          {/* Verified Judge Card */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-amber-500/40 shrink-0">
              {verifiedJudge.photoUrl || verifiedJudge.costumePhoto ? (
                <img
                  src={verifiedJudge.photoUrl || verifiedJudge.costumePhoto}
                  alt={verifiedJudge.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-amber-400">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white text-xs sm:text-sm truncate">
                  คุณ{verifiedJudge.name} {verifiedJudge.nickname ? `(${verifiedJudge.nickname})` : ''}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center space-x-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>ยืนยันตัวตนแล้ว</span>
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate flex items-center space-x-1.5">
                <span className="text-amber-400 font-bold">{verifiedJudge.ticketNo}</span>
                <span>•</span>
                <span>{verifiedJudge.club || 'ผู้ร่วมงาน'}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">(สิทธิ์: ให้คะแนนได้ 1 ครั้ง)</span>
              </div>
            </div>
          </div>

          {/* Search Candidate & Switch Judge Button */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, เลขบัตร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
              />
            </div>

            {!isReadOnlyMode && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("ต้องการออกจากระบบลงคะแนนของกรรมการท่านนี้ เพื่อเปลี่ยนกรรมการใช่หรือไม่?")) {
                    sessionStorage.removeItem("sme_fan_verified_judge_v1");
                    localStorage.removeItem("sme_fan_verified_judge_v1");
                    setVerifiedJudge(null);
                    setSelectedCandidateForVerify(null);
                    setPhoneInput("");
                    setIsReadOnlyMode(false);
                  }
                }}
                title="เปลี่ยนกรรมการตัดสิน / ออกจากระบบ"
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs flex items-center space-x-1 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">เปลี่ยนกรรมการ</span>
              </button>
            )}
          </div>
        </div>

        {/* Individual vs Team Category Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-white/5 shrink-0">
          <button
            type="button"
            onClick={() => setJudgeTab('individual')}
            className={`py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 ${
              judgeTab === 'individual'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>1. ประเภทบุคคล (เดี่ยว) ({eligibleIndividuals.length} ท่าน)</span>
          </button>

          <button
            type="button"
            onClick={() => setJudgeTab('team')}
            className={`py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 ${
              judgeTab === 'team'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. ประเภทกลุ่ม (ทีม) ({effectiveTeams.length} ทีม)</span>
          </button>
        </div>

        {/* 2-COLUMN SIDE-BY-SIDE LAYOUT: BEAUTY vs CREATIVITY */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Column 1: รางวัลความสวยงาม */}
          {renderAwardColumn(
            'beauty',
            'รางวัลความสวยงาม',
            <Sparkles className="w-4 h-4" />,
            {
              headerBg: 'bg-gradient-to-r from-rose-950/70 via-pink-950/40 to-slate-950/80',
              border: 'border-rose-500/30',
              badgeBg: 'bg-rose-500/20',
              badgeText: 'text-rose-300',
              cardActiveBg: 'bg-rose-950/30',
              pointActiveBg: 'bg-gradient-to-r from-rose-400 to-pink-500'
            }
          )}

          {/* Column 2: รางวัลความคิดสร้างสรรค์ */}
          {renderAwardColumn(
            'creativity',
            'รางวัลความคิดสร้างสรรค์',
            <Award className="w-4 h-4" />,
            {
              headerBg: 'bg-gradient-to-r from-amber-950/70 via-yellow-950/40 to-slate-950/80',
              border: 'border-amber-500/30',
              badgeBg: 'bg-amber-500/20',
              badgeText: 'text-amber-300',
              cardActiveBg: 'bg-amber-950/30',
              pointActiveBg: 'bg-gradient-to-r from-amber-400 to-yellow-400'
            }
          )}

        </div>

        {/* Bottom Submit & Auto-Send Controls */}
        <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 text-center sm:text-left">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold text-[11px] border border-emerald-500/30 shadow-sm">
              ⚡ ระบบส่งคะแนนอัตโนมัติทันทีเมื่อกดปิดหรือส่งผล
            </span>
            <span className="text-slate-300 font-medium">
              (ลงคะแนนแล้ว {countAssignedScores(scores)} รายการ)
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleFinalizeVotes(true)}
              className="flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs sm:text-sm border border-white/10 flex items-center justify-center space-x-1.5 transition-all"
            >
              <X className="w-4 h-4" />
              <span>ปิดหน้าต่าง {!isReadOnlyMode && hasAnyScore(scores) ? '(ส่งคะแนนทันที)' : ''}</span>
            </button>

            {!isReadOnlyMode && (
              <button
                type="button"
                onClick={() => handleFinalizeVotes(false)}
                className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all hover:scale-105 active:scale-95 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>ส่งผลคะแนนของกรรมการ</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* REASON FOR SCORE CHANGE PROMPT MODAL */}
      {pendingScoreChange && !isReadOnlyMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 max-w-md w-full text-slate-100 shadow-2xl space-y-4">
            
            <div className="flex items-center space-x-2.5 text-amber-400">
              <FileText className="w-5 h-5" />
              <h4 className="font-extrabold text-white text-base">
                ระบุเหตุผลในการแก้ไขคะแนน
              </h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              ท่านกำลังเปลี่ยนคะแนน
              <span className="text-amber-300 font-bold ml-1">
                [{pendingScoreChange.award === 'beauty' ? 'รางวัลความสวยงาม' : 'รางวัลความคิดสร้างสรรค์'}]
              </span>
              จาก <strong className="text-rose-400 font-mono text-sm">{pendingScoreChange.oldScore} คะแนน</strong> เป็น <strong className="text-emerald-400 font-mono text-sm">{pendingScoreChange.newScore} คะแนน</strong> ตามเกณฑ์เพื่อความโปร่งใส กรุณาระบุเหตุผลในการแก้ไข:
            </p>

            <textarea
              rows={3}
              placeholder="เช่น พิจารณาความประณีตของชุดเพิ่มเติม, สลับอันดับคะแนน..."
              value={changeReasonInput}
              onChange={(e) => setChangeReasonInput(e.target.value)}
              className="w-full bg-slate-950 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />

            {/* Quick Reason Chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                "พิจารณาความประณีตของชุดเพิ่มเติม",
                "สลับอันดับคะแนนใหม่",
                "ปรับตามเกณฑ์ความคิดสร้างสรรค์",
                "ดูภาพรวมชุดทั้งตัวอีกครั้ง"
              ].map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setChangeReasonInput(chip)}
                  className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5"
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingScoreChange(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmScoreChange}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25"
              >
                ยืนยันการเปลี่ยนคะแนน
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
