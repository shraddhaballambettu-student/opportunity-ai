import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Compass, FileText, Sparkles, Bell, Target, Settings,
  Search, Upload, ArrowUpRight, Clock3, CheckCircle2, AlertCircle, Menu,
  X, GraduationCap, BriefcaseBusiness, HeartHandshake, ChevronRight,
  TrendingUp, Filter, ExternalLink, BrainCircuit, ShieldCheck, Zap
} from "lucide-react";

const API = "http://localhost:8000";
const nav = [
  ["Overview", LayoutDashboard], ["Discover", Compass], ["Resume Analyzer", FileText],
  ["My Matches", Target], ["Skill Gaps", BrainCircuit], ["Deadlines", Bell]
];

function initials(s = "Guest User") {
  return s.split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase();
}
function daysLeft(dateString) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(`${dateString}T00:00:00`);
  return Math.ceil((d - today) / 86400000);
}
function App() {
  const [page, setPage] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [matches, setMatches] = useState([]);
  const savedProfile = (() => {
  try {
    return JSON.parse(
      localStorage.getItem("opportunity-ai-profile") || "{}"
    );
  } catch {
    return {};
  }
})();

  const [skills, setSkills] = useState(
    savedProfile.skills ?? ["python", "communication", "html", "css"]
  );

  const [education, setEducation] = useState(
    savedProfile.education ?? "Undergraduate student"
  );

  const [interests, setInterests] = useState(
    savedProfile.interests ?? ["Internship", "Scholarship"]
  );

  useEffect(() => {
  localStorage.setItem(
    "opportunity-ai-profile",
    JSON.stringify({ skills, education, interests })
  );
}, [skills, education, interests]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [resumeInfo, setResumeInfo] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const notify = (msg) => { setToast(msg); window.setTimeout(() => setToast(""), 2800); };

  async function loadOpportunities() {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/opportunities`);
      if (!res.ok) throw new Error("Could not load opportunities.");
      setOpportunities(await res.json());
    } catch (e) {
      setError("Can't connect to the backend. Start FastAPI at http://localhost:8000.");
    } finally { setLoading(false); }
  }
  async function loadMatches() {
    try {
      const res = await fetch(`${API}/api/match`, {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({skills, education, interests})
      });
      if (res.ok) setMatches(await res.json());
    } catch { /* dashboard remains usable with loaded opportunity data */ }
  }
  useEffect(() => { loadOpportunities(); }, []);
  useEffect(() => { if (opportunities.length) loadMatches(); }, [opportunities, skills, education, interests]);

  const filtered = useMemo(() => opportunities.filter(o => {
    const q = search.toLowerCase();
    const matchesQuery = !q || `${o.title} ${o.organization} ${o.description} ${o.category} ${o.location}`.toLowerCase().includes(q);
    return matchesQuery && (category === "All" || o.category === category);
  }), [opportunities, search, category]);

  const urgent = [...opportunities].sort((a,b) => daysLeft(a.deadline)-daysLeft(b.deadline)).slice(0,3);
  const topMatches = matches.slice(0,3);
  const allMissing = [...new Set(matches.flatMap(m => m.missing_skills))].slice(0,8);
  const matchedCount = matches.filter(m => m.match_score >= 50).length;

  async function uploadResume(file) {
    if (!file) return;
    setError(""); setUploading(true); setResumeInfo(null);
    const form = new FormData(); form.append("file", file);
    try {
      const res = await fetch(`${API}/api/analyze-resume`, {method:"POST", body:form});
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Resume analysis failed.");
      setResumeInfo(data);
      if (data.skills?.length) setSkills(data.skills);
      notify("Resume analyzed successfully");
    } catch (e) { setError(e.message); }
    finally { setUploading(false); }
  }
  function toggleSkill(skill) {
    setSkills(old => old.includes(skill) ? old.filter(x => x !== skill) : [...old, skill]);
  }
  const categories = ["All", ...new Set(opportunities.map(o => o.category))];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="brand">
        <div className="brand-mark"><Sparkles size={21}/></div>
        <div><strong>opportunity<span>ai</span></strong><small>YOUR NEXT CHAPTER STARTS HERE</small></div>
        <button className="mobile-close" onClick={()=>setMobileOpen(false)}><X size={19}/></button>
      </div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(([label, Icon]) => <button key={label} className={`nav-item ${page===label?"active":""}`} onClick={()=>{setPage(label);setMobileOpen(false);}}>
        <Icon size={18}/><span>{label}</span>{label==="My Matches" && <em>{matchedCount}</em>}
      </button>)}</nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><Zap size={17}/></div><b>Make your next move</b><p>Small steps today create big opportunities tomorrow.</p><button onClick={()=>setPage("Skill Gaps")}>Explore skills <ArrowUpRight size={14}/></button></div>
        <button className="nav-item"><Settings size={18}/><span>Settings</span></button>
        <div className="profile"><div className="avatar">GU</div><div><b>Guest User</b><small>Free workspace</small></div><span className="online-dot"/></div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <button className="hamburger" onClick={()=>setMobileOpen(true)}><Menu/></button>
        <div className="breadcrumb">Workspace <ChevronRight size={14}/> <b>{page}</b></div>
        <div className="top-actions"><span className="date-label">Your opportunity hub</span><button className="icon-button" onClick={()=>setPage("Deadlines")} aria-label="Notifications"><Bell size={18}/><i/></button><div className="avatar small">GU</div></div>
      </header>
      <div className="content">
        {error && <div className="error-banner"><AlertCircle size={17}/>{error}<button onClick={()=>setError("")}>Dismiss</button></div>}
        {page==="Overview" && <Overview opportunities={opportunities} topMatches={topMatches} urgent={urgent} skills={skills} setPage={setPage} loading={loading}/>}
        {page==="Discover" && <section>
          <PageHeading eyebrow="EXPLORE WHAT'S POSSIBLE" title="Discover opportunities" subtitle="Find the next step that fits your goals, skills and ambition."/>
          <div className="search-row"><div className="searchbox"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search roles, scholarships, skills..."/></div><div className="select-wrap"><Filter size={16}/><select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></div></div>
          <div className="results-line"><span><b>{filtered.length}</b> opportunities found</span><span>Collected opportunities · Always verify details on official sites</span></div>
          {loading ? <Loading/> : <div className="opportunity-grid">{filtered.map(o=><OpportunityCard key={o.id} item={o}/>)}</div>}
          {!loading && filtered.length===0 && <Empty title="No opportunities found" text="Try another keyword or category filter."/>}
        </section>}
        {page==="Resume Analyzer" && <section>
          <PageHeading eyebrow="YOUR PROFILE, UNDERSTOOD" title="Resume analyzer" subtitle="Turn your experience into a profile that finds better-fit opportunities."/>
          <div className="two-col">
            <div className="panel upload-panel"><div className="panel-title"><div className="soft-icon purple"><FileText/></div><div><h3>Upload your resume</h3><p>PDF, DOCX or TXT · Maximum 5 MB</p></div></div>
              <label className="dropzone"><input type="file" accept=".pdf,.docx,.txt" onChange={e=>uploadResume(e.target.files?.[0])}/><div className="upload-icon"><Upload size={23}/></div><b>{uploading?"Analyzing your resume...":"Drop your resume here"}</b><span>or <u>browse files</u> from your device</span><small>Your resume text is processed for this analysis and is not stored by this demo.</small></label>
              {uploading && <div className="progress"><span/></div>}
              {resumeInfo && <div className="success-note"><CheckCircle2 size={17}/><div><b>{resumeInfo.filename}</b><small>{resumeInfo.word_count} words scanned · {resumeInfo.skills.length} skills detected</small></div></div>}
            </div>
            <div className="panel profile-panel"><div className="section-head"><div><h3>Your career profile</h3><p>Review and edit these details to improve matching.</p></div><span className="pill green">Editable</span></div>
              <label className="field-label">EDUCATION / CURRENT STATUS</label><input className="text-input" value={education} onChange={e=>setEducation(e.target.value)} placeholder="e.g. Final-year computer science student"/>
              <label className="field-label">INTEREST AREAS</label><div className="chip-row">{["Internship","Scholarship","Job","Fellowship","Government Scheme"].map(x=><button key={x} className={`choice-chip ${interests.includes(x)?"chosen":""}`} onClick={()=>setInterests(old=>old.includes(x)?old.filter(v=>v!==x):[...old,x])}>{x}</button>)}</div>
            </div>
          </div>
          <div className="panel skills-panel"><div className="section-head"><div><h3><Sparkles size={18}/> Detected & selected skills</h3><p>Click a skill to add or remove it from your matching profile.</p></div><span className="pill">{skills.length} skills selected</span></div><div className="skill-cloud">{[...new Set([...skills,...["python","javascript","react","sql","data analysis","communication","leadership","html","css","figma","machine learning","excel","research","git"]])].map(s=><button key={s} className={`skill-chip ${skills.includes(s)?"selected":""}`} onClick={()=>toggleSkill(s)}>{skills.includes(s)&&<CheckCircle2 size={13}/>} {s}</button>)}</div><button className="primary-button compact" onClick={()=>{loadMatches();notify("Your matching profile has been updated");}}>Update my matches <ArrowUpRight size={16}/></button></div>
        </section>}
        {page==="My Matches" && <section><PageHeading eyebrow="PERSONALIZED FOR YOU" title="Your best-fit matches" subtitle="Recommendations are ranked using skill overlap, profile and selected interests."/><div className="match-summary"><div><span>PROFILE SKILLS</span><b>{skills.length}</b></div><div><span>STRONG MATCHES</span><b>{matchedCount}</b></div><div><span>OPPORTUNITIES</span><b>{matches.length}</b></div></div><div className="stack-list">{matches.map(m=><MatchCard key={m.id} item={m}/>)}</div></section>}
        {page==="Skill Gaps" && <section><PageHeading eyebrow="GROW WITH PURPOSE" title="Your skill gap analyzer" subtitle="See which skills appear most often in opportunities that match your interests."/><div className="skill-overview"><div className="panel"><div className="soft-icon purple"><BrainCircuit/></div><h3>Skills to strengthen</h3><p className="muted">These skills appear in our demo opportunity set but aren't in your profile yet.</p><div className="gap-list">{allMissing.length?allMissing.map((s,i)=><div className="gap-item" key={s}><div><b>{s}</b><small>Recommended learning focus</small></div><span className="gap-tag">{i<2?"High priority":"Explore"}</span><button onClick={()=>{setSkills(old=>old.includes(s)?old:[...old,s]);notify(`${s} added to your profile`);}}>+ Add</button></div>):<p>Great! No missing skills in this sample set.</p>}</div></div><div className="panel learning-panel"><div className="soft-icon orange"><GraduationCap/></div><h3>Suggested learning path</h3><p className="muted">A simple plan to build confidence in your next application.</p>{[["01","Choose one skill","Focus on one gap relevant to your target role."],["02","Learn by building","Complete a small project to demonstrate the skill."],["03","Update your profile","Add verified projects and certifications to your resume."]].map(x=><div className="learning-step" key={x[0]}><span>{x[0]}</span><div><b>{x[1]}</b><p>{x[2]}</p></div></div>)}<div className="disclaimer"><ShieldCheck size={16}/> Learning suggestions are guidance, not a guarantee of selection.</div></div></div></section>}
        {page==="Deadlines" && <section><PageHeading eyebrow="STAY A STEP AHEAD" title="Deadline tracker" subtitle="Keep important closing dates in view and plan your applications early."/><div className="deadline-banner"><div className="deadline-symbol"><Clock3/></div><div><b>Don't let a great opportunity pass you by.</b><p>Listings below use sample dates generated for this prototype. Always confirm deadlines with the official provider.</p></div></div><div className="stack-list">{[...opportunities].sort((a,b)=>daysLeft(a.deadline)-daysLeft(b.deadline)).map(o=><div className="deadline-row" key={o.id}><div className="date-tile"><b>{new Date(o.deadline+"T00:00:00").getDate()}</b><span>{new Date(o.deadline+"T00:00:00").toLocaleString("en",{month:"short"}).toUpperCase()}</span></div><div className="deadline-info"><b>{o.title}</b><span>{o.organization} · {o.category}</span></div><span className={`deadline-status ${daysLeft(o.deadline)<=7?"urgent":""}`}>{daysLeft(o.deadline)<0?"Date passed":daysLeft(o.deadline)===0?"Closes today":`${daysLeft(o.deadline)} days left`}</span><a href={o.link} target="_blank" rel="noreferrer" className="text-link">View <ExternalLink size={14}/></a></div>)}</div></section>}
      </div>
      <footer><span>© 2026 Opportunity AI</span><span>Discover. Match. Prepare. Achieve.</span><span className="demo-indicator"><i/> Demo environment</span></footer>
    </main>
    {toast && <div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
  </div>;
}

function PageHeading({eyebrow,title,subtitle}) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div><div className="heading-spark"><Sparkles size={22}/></div></div>;
}
function Loading(){return <div className="loading-state"><div className="spinner"/>Loading opportunities...</div>}
function Empty({title,text}){return <div className="empty-state"><Search size={25}/><b>{title}</b><p>{text}</p></div>}
function Overview({opportunities,topMatches,urgent,skills,setPage,loading}) {
  return <section>
    <div className="welcome-banner"><div className="welcome-copy"><span className="eyebrow light">YOUR FUTURE, UNLOCKED</span><h1>Discover what<br/>you're capable of.</h1><p>Find opportunities that fit your skills, ambitions and next big move.</p><button className="white-button" onClick={()=>setPage("Discover")}>Explore opportunities <ArrowUpRight size={16}/></button></div><div className="banner-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-core"><Sparkles size={35}/></div><div className="float-card fc-one"><Target size={15}/> Perfect fit</div><div className="float-card fc-two"><TrendingUp size={15}/> New possibilities</div><div className="art-dot dot-one"/><div className="art-dot dot-two"/></div></div>
    <div className="stat-grid"><Stat icon={Compass} label="Opportunities" value={opportunities.length} note="Across multiple categories" color="violet"/><Stat icon={Target} label="Your matches" value={topMatches.length} note="Top personalized picks" color="blue"/><Stat icon={Clock3} label="Closing soon" value={urgent.filter(x=>daysLeft(x.deadline)<=10).length} note="Within the next 10 days" color="orange"/><Stat icon={Zap} label="Profile skills" value={skills.length} note="Ready for matching" color="green"/></div>
    <div className="section-row"><div><span className="eyebrow">A GOOD PLACE TO START</span><h2>Recommended for you</h2></div><button className="view-all" onClick={()=>setPage("My Matches")}>View all matches <ArrowUpRight size={15}/></button></div>
    {loading?<Loading/>:<div className="opportunity-grid">{topMatches.map(o=><OpportunityCard key={o.id} item={o} score={o.match_score}/>)}</div>}
    <div className="section-row deadline-section"><div><span className="eyebrow">KEEP YOUR MOMENTUM</span><h2>Coming up next</h2></div><button className="view-all" onClick={()=>setPage("Deadlines")}>All deadlines <ArrowUpRight size={15}/></button></div>
    <div className="mini-deadlines">{urgent.map(o=><div className="mini-deadline" key={o.id}><div className="mini-date"><b>{daysLeft(o.deadline)}</b><small>DAYS</small></div><div><b>{o.title}</b><span>{o.organization}</span></div><ChevronRight size={17}/></div>)}</div>
  </section>;
}
function Stat({icon:Icon,label,value,note,color}) {
  return <div className="stat-card"><div className={`stat-icon ${color}`}><Icon size={19}/></div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}
function OpportunityCard({item,score}) {
  const icons = {"Scholarship":GraduationCap,"Internship":BriefcaseBusiness,"Job":BriefcaseBusiness,"Fellowship":HeartHandshake,"Government Scheme":ShieldCheck};
  const Icon = icons[item.category] || Compass;
  const left = item.deadline ? daysLeft(item.deadline) : null;
  const skills = Array.isArray(item.skills) ? item.skills : [];
  return <article className="opportunity-card"><div className="card-top"><div className="category-icon"><Icon size={19}/></div><span className="category-label">{item.category}</span>{score!==undefined&&<span className="match-label">{score}% match</span>}</div><h3>{item.title}</h3><p className="organization">{item.organization}</p><p className="card-description">{item.description}</p><div className="tag-row">
  {skills.slice(0,3).map(s=><span key={s}>{s}</span>)}
</div><div className="card-meta"><span>
  <Clock3 size={14}/>
  {left === null ? "Deadline not specified" :
   left < 0 ? "Deadline passed" :
   left === 0 ? "Closes today" :
   `${left} days left`}
</span><span>{item.location}</span></div><a className="card-link" href={item.link} target="_blank" rel="noreferrer">View official source <ArrowUpRight size={15}/></a></article>;
}
function MatchCard({item}) {
  return <article className="match-card"><div className="match-main"><div className="match-card-icon"><Sparkles size={18}/></div><div><span className="eyebrow">{item.category} · {item.organization}</span><h3>{item.title}</h3><p>{item.description}</p></div></div><div className="score-area"><div className="score-ring" style={{"--score":`${item.match_score}%`}}><b>{item.match_score}</b><small>%</small></div><span>Match score</span></div><div className="match-details"><div><b><CheckCircle2 size={15}/> Matched skills</b><div className="tag-row">{item.matched_skills.length?item.matched_skills.map(s=><span key={s}>{s}</span>):<small>No direct skill overlap yet</small>}</div></div><div><b><AlertCircle size={15}/> Skills to build</b><div className="tag-row">{item.missing_skills.length?item.missing_skills.slice(0,4).map(s=><span className="missing-tag" key={s}>{s}</span>):<small>No gaps detected</small>}</div></div></div><div className="match-footer"><span className="eligibility"><ShieldCheck size={14}/>{item.eligibility_status}</span><a href={item.link} target="_blank" rel="noreferrer">Official details <ExternalLink size={14}/></a></div></article>;
}
export default App;
