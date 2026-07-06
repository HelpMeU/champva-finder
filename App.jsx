import { useState, useMemo, useCallback, useRef, useEffect } from "react";

// ─── Real Provider Data (community-verified) ─────────────────────────────────

const PROVIDERS = [
  {
    id:1,
    name:"Metro Mayaguez",
    type:"Clinic",
    address:"15 Dr Basora Street",
    city:"Mayaguez",
    state:"PR",
    zip:"00680",
    phone:"(787) 834-0101",
    rating:5.0,
    reviews:1,
    champvaExperience:"Expert",
    acceptingNew:true,
    telehealth:true,
    languages:["English","Spanish"],
    notes:"Submitted by a CHAMPVA family. Expert-level billing experience reported.",
    specialties:["Clinic"],
    verified:false,
    providerSubmitted:false,
    lat:18.2013,
    lng:-67.1397,
  },
  {
    id:2,
    name:"Jessica Williams, LPC",
    type:"Mental Health",
    address:"1000 Chinaberry Dr, Suite 502",
    city:"Bossier City",
    state:"LA",
    zip:"71111",
    phone:"(318) 519-1915",
    rating:5.0,
    reviews:1,
    champvaExperience:"Expert",
    acceptingNew:true,
    telehealth:true,
    languages:["English"],
    notes:"Licensed Professional Counselor accepting CHAMPVA. Expert with CHAMPVA billing.",
    specialties:["Counseling","Mental Health"],
    verified:false,
    providerSubmitted:true,
    lat:32.5160,
    lng:-93.7321,
  },
  {
    id:3,
    name:"April T. Kitchens, LPC, LLC",
    type:"Mental Health",
    address:"601 N. Belair Square, Suite 2",
    city:"Evans",
    state:"GA",
    zip:"30809",
    phone:"(706) 250-1203",
    rating:5.0,
    reviews:1,
    champvaExperience:"Learning",
    acceptingNew:true,
    telehealth:true,
    languages:["English"],
    notes:"Currently building CHAMPVA billing experience. Call ahead to confirm billing process before your first appointment.",
    specialties:["Counseling","Mental Health"],
    verified:false,
    providerSubmitted:false,
    lat:33.5376,
    lng:-82.1318,
  },
  {
    id:4,
    name:"ANEW U Counseling Services / Amanda Richardson, LPC, LCMHC",
    type:"Mental Health",
    address:"1057 Dresser Court",
    city:"Raleigh",
    state:"NC",
    zip:"27609",
    phone:"(984) 212-0028",
    rating:5.0,
    reviews:1,
    champvaExperience:"Expert",
    acceptingNew:true,
    telehealth:true,
    languages:["English"],
    notes:"Veteran-owned practice. One of our clinicians (Amanda Richardson) is a veteran and prides herself on taking care of her 'family'. Expert CHAMPVA billing experience.",
    specialties:["Counseling","Mental Health","Veteran Care"],
    verified:false,
    providerSubmitted:true,
    lat:35.8328,
    lng:-78.6483,
  },
];

const STATES = [...new Set(PROVIDERS.map(p => p.state))].sort();
const TYPES  = [...new Set(PROVIDERS.map(p => p.type))].sort();
const ALL_STATES = ["AK","AL","AR","AZ","CA","CO","CT","DC","DE","FL","GA","HI","IA","ID","IL","IN","KS","KY","LA","MA","MD","ME","MI","MN","MO","MS","MT","NC","ND","NE","NH","NJ","NM","NV","NY","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VA","VT","WA","WI","WV","WY"];
const ALL_TYPES  = ["Clinic","Dental","Mental Health","OB/GYN","Pediatrics","Primary Care","Specialist","Urgent Care","Other"];

// ─── CHAMPVA Constants ───────────────────────────────────────────────────────
const INDIV_DEDUCTIBLE  = 50;
const FAMILY_DEDUCTIBLE = 100;
const CHAMPVA_RATE      = 0.75;
const CATASTROPHIC_CAP  = 3000;

// ─── Utility ─────────────────────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
const fmt$ = n => `$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  navy:"#0B1F3A", navyLight:"#1a3a6e", gold:"#C9952A", goldLight:"#f0c060",
  bg:"#F0F3F7", surface:"#ffffff", border:"#e2e8f0",
  text:"#111827", muted:"#6b7280", subtle:"#9ca3af",
  green:"#16a34a", greenBg:"#dcfce7", red:"#dc2626", redBg:"#fee2e2",
  yellow:"#d97706", yellowBg:"#fef3c7",
  blue:"#1d4ed8", blueBg:"#dbeafe",
};

const EXP = {
  Expert:   { bg:"#dcfce7", text:"#166534", dot:"#16a34a" },
  Familiar: { bg:"#fef3c7", text:"#92400e", dot:"#d97706" },
  Learning: { bg:"#fee2e2", text:"#991b1b", dot:"#dc2626" },
};

// ─── Micro-components ─────────────────────────────────────────────────────────
function Stars({ r, size=14 }) {
  return <span style={{display:"inline-flex",gap:1}}>
    {[1,2,3,4,5].map(i=><span key={i} style={{fontSize:size,color:i<=Math.round(r)?C.gold:"#d1d5db"}}>★</span>)}
  </span>;
}

function Badge({ level }) {
  const s = EXP[level]||EXP.Learning;
  return <span style={{background:s.bg,color:s.text,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",gap:5}}>
    <span style={{width:7,height:7,borderRadius:"50%",background:s.dot,display:"inline-block"}}/>
    {level}
  </span>;
}

function Tag({ children, color=C.blueBg, textColor=C.blue }) {
  return <span style={{background:color,color:textColor,borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{children}</span>;
}

function Pill({ children, active, onClick }) {
  return <button onClick={onClick} style={{
    border:`1.5px solid ${active?C.navy:C.border}`,
    background:active?C.navy:"#fff",color:active?"#fff":C.muted,
    borderRadius:20,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .15s"
  }}>{children}</button>;
}

function Section({ title, children, style={} }) {
  return <div style={{background:"#fff",borderRadius:16,border:`1.5px solid ${C.border}`,padding:"24px 22px",marginBottom:20,...style}}>
    {title && <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:18,color:C.navy,margin:"0 0 16px",lineHeight:1.2}}>{title}</h3>}
    {children}
  </div>;
}

// ─── Trust Badge ──────────────────────────────────────────────────────────────
function TrustBadge({ providerSubmitted, verified }) {
  if (verified) return <span style={{background:"#dbeafe",color:"#1e40af",borderRadius:20,padding:"2px 9px",fontSize:10,fontWeight:700}}>✓ Verified</span>;
  if (providerSubmitted) return <span style={{background:"#f3e8ff",color:"#6b21a8",borderRadius:20,padding:"2px 9px",fontSize:10,fontWeight:700}}>Provider-Listed</span>;
  return <span style={{background:C.yellowBg,color:"#92400e",borderRadius:20,padding:"2px 9px",fontSize:10,fontWeight:700}}>⚠ Unverified — Call Ahead</span>;
}

// ─── Provider Card ────────────────────────────────────────────────────────────
function ProviderCard({ p, dist, onSelect }) {
  const [hover,setHover] = useState(false);
  return <div
    onClick={()=>onSelect(p)}
    onMouseEnter={()=>setHover(true)}
    onMouseLeave={()=>setHover(false)}
    style={{background:"#fff",border:`1.5px solid ${hover?C.gold:C.border}`,borderRadius:14,padding:"18px 20px",cursor:"pointer",
      transform:hover?"translateY(-2px)":"none",boxShadow:hover?"0 8px 32px rgba(11,31,58,.12)":"none",
      transition:"all .18s",display:"flex",flexDirection:"column",gap:10}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
      <div>
        <div style={{fontFamily:"'DM Serif Display',serif",fontWeight:700,fontSize:16,color:C.navy,lineHeight:1.25}}>{p.name}</div>
        <div style={{fontSize:12,color:C.muted,marginTop:2,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          {p.type}
          <TrustBadge providerSubmitted={p.providerSubmitted} verified={p.verified}/>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
        <Badge level={p.champvaExperience}/>
        {p.acceptingNew
          ? <span style={{fontSize:11,color:C.green,fontWeight:700}}>✓ Accepting New</span>
          : <span style={{fontSize:11,color:C.red,fontWeight:700}}>✗ Not Accepting</span>}
      </div>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <Stars r={p.rating}/>
      <span style={{fontSize:13,fontWeight:700,color:C.navy}}>{p.rating.toFixed(1)}</span>
      <span style={{fontSize:12,color:C.muted}}>({p.reviews} {p.reviews===1?"review":"reviews"})</span>
      {dist!=null && <span style={{marginLeft:"auto",fontSize:12,color:C.blue,fontWeight:700,background:C.blueBg,borderRadius:12,padding:"2px 8px"}}>
        📍 {dist<1?`${(dist*5280).toFixed(0)} ft`:dist<10?`${dist.toFixed(1)} mi`:`${Math.round(dist)} mi`}
      </span>}
    </div>
    <div style={{fontSize:12,color:C.text}}>📍 {p.address}, {p.city}, {p.state} {p.zip}</div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {p.specialties.map(s=><Tag key={s}>{s}</Tag>)}
      {p.telehealth&&<Tag color="#e0f2fe" textColor="#0369a1">📱 Telehealth</Tag>}
    </div>
    <div style={{fontSize:12,color:C.muted,borderTop:`1px solid ${C.border}`,paddingTop:10,lineHeight:1.5}}>💬 {p.notes}</div>
  </div>;
}

// ─── Provider Modal ───────────────────────────────────────────────────────────
function Modal({ p, onClose }) {
  if (!p) return null;
  return <div style={{position:"fixed",inset:0,background:"rgba(11,31,58,.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
    <div style={{background:"#fff",borderRadius:20,maxWidth:560,width:"100%",maxHeight:"88vh",overflowY:"auto",padding:"30px 26px",position:"relative"}} onClick={e=>e.stopPropagation()}>
      <button onClick={onClose} style={{position:"absolute",top:14,right:16,background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.muted}}>✕</button>
      <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:16}}>
        <div style={{width:52,height:52,borderRadius:14,background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>🏥</div>
        <div>
          <div style={{fontFamily:"'DM Serif Display',serif",fontWeight:700,fontSize:20,color:C.navy,lineHeight:1.2}}>{p.name}</div>
          <div style={{color:C.muted,fontSize:13,marginTop:3,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            {p.type} · {p.city}, {p.state}
            <TrustBadge providerSubmitted={p.providerSubmitted} verified={p.verified}/>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
        <Badge level={p.champvaExperience}/>
        {p.acceptingNew
          ? <span style={{background:C.greenBg,color:"#166534",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>✓ Accepting New Patients</span>
          : <span style={{background:C.redBg,color:"#991b1b",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>✗ Not Accepting</span>}
        {p.telehealth&&<span style={{background:"#e0f2fe",color:"#0369a1",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>📱 Telehealth</span>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
        {[
          ["Rating",<><Stars r={p.rating}/> <strong>{p.rating.toFixed(1)}</strong> ({p.reviews} {p.reviews===1?"review":"reviews"})</>],
          ["Phone",p.phone],
          ["Address",`${p.address}, ${p.city}, ${p.state} ${p.zip}`],
          ["Languages",p.languages.join(", ")]
        ].map(([l,v])=>(
          <div key={l} style={{background:C.bg,borderRadius:10,padding:"10px 13px"}}>
            <div style={{fontSize:10,color:C.subtle,fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>{l}</div>
            <div style={{fontSize:13,color:C.text,marginTop:3,fontWeight:500}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:10,color:C.subtle,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Specialties</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{p.specialties.map(s=><Tag key={s}>{s}</Tag>)}</div>
      </div>
      <div style={{background:"#fffbeb",borderRadius:12,padding:"14px 16px",marginBottom:18,borderLeft:`3px solid ${C.gold}`}}>
        <div style={{fontSize:11,color:"#92400e",fontWeight:700,marginBottom:4}}>Community Notes</div>
        <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>{p.notes}</div>
      </div>
      {!p.verified && <div style={{background:C.bg,borderRadius:10,padding:"10px 13px",marginBottom:16,fontSize:12,color:C.muted}}>
        ℹ️ This listing has not yet been independently verified. Always call ahead to confirm CHAMPVA is accepted before your appointment.
      </div>}
      <div style={{display:"flex",gap:10}}>
        <a href={`tel:${p.phone}`} style={{flex:1,background:C.navy,color:"#fff",borderRadius:10,padding:"12px 0",textAlign:"center",textDecoration:"none",fontWeight:700,fontSize:13}}>📞 Call</a>
        <button style={{flex:1,background:C.gold,color:"#fff",border:"none",borderRadius:10,padding:"12px 0",fontWeight:700,fontSize:13,cursor:"pointer"}}>✍️ Leave Review</button>
      </div>
    </div>
  </div>;
}

// ─── Find Providers Tab ───────────────────────────────────────────────────────
function FindTab() {
  const [query,setQuery]       = useState("");
  const [stateF,setStateF]     = useState("");
  const [typeF,setTypeF]       = useState("");
  const [expF,setExpF]         = useState("");
  const [newOnly,setNewOnly]   = useState(false);
  const [teleOnly,setTeleOnly] = useState(false);
  const [sortBy,setSortBy]     = useState("rating");
  const [zipInput,setZipInput] = useState("");
  const [userLoc,setUserLoc]   = useState(null);
  const [locLabel,setLocLabel] = useState("");
  const [locLoading,setLocLoading] = useState(false);
  const [locError,setLocError] = useState("");
  const [selected,setSelected] = useState(null);

  const geoLocate = () => {
    setLocLoading(true); setLocError("");
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLoc({lat:pos.coords.latitude,lng:pos.coords.longitude}); setLocLabel("your location"); setLocLoading(false); setSortBy("distance"); },
      () => { setLocError("Location access denied. Try entering your ZIP code."); setLocLoading(false); }
    );
  };

  const zipLocate = async () => {
    if (zipInput.length<5) return;
    setLocLoading(true); setLocError("");
    try {
      const r = await fetch(`https://api.zippopotam.us/us/${zipInput}`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      const place = d.places[0];
      setUserLoc({lat:parseFloat(place.latitude),lng:parseFloat(place.longitude)});
      setLocLabel(`${place["place name"]}, ${place["state abbreviation"]}`);
      setSortBy("distance");
    } catch { setLocError("ZIP not found. Try another or use location button."); }
    setLocLoading(false);
  };

  const withDist = useMemo(()=>PROVIDERS.map(p=>({...p, dist:userLoc?haversine(userLoc.lat,userLoc.lng,p.lat,p.lng):null})),[userLoc]);

  const filtered = useMemo(()=>{
    const q=query.toLowerCase();
    return withDist.filter(p=>{
      const mQ=!q||p.name.toLowerCase().includes(q)||p.city.toLowerCase().includes(q)||p.zip.includes(q)||p.specialties.some(s=>s.toLowerCase().includes(q));
      return mQ&&(!stateF||p.state===stateF)&&(!typeF||p.type===typeF)&&(!expF||p.champvaExperience===expF)&&(!newOnly||p.acceptingNew)&&(!teleOnly||p.telehealth);
    }).sort((a,b)=>{
      if (sortBy==="distance"&&a.dist!=null) return a.dist-b.dist;
      if (sortBy==="rating") return b.rating-a.rating;
      if (sortBy==="reviews") return b.reviews-a.reviews;
      return 0;
    });
  },[query,stateF,typeF,expF,newOnly,teleOnly,sortBy,withDist]);

  const sel = s=>({border:`1.5px solid ${C.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,background:"#fff",color:C.text,cursor:"pointer",appearance:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center",paddingRight:30,...s});

  return <>
    {/* Location Bar */}
    <div style={{background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:14,padding:"18px 20px",marginBottom:20}}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:15,color:C.navy,marginBottom:12}}>📍 Search Near You</div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <button onClick={geoLocate} disabled={locLoading} style={{background:C.navy,color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0}}>
          {locLoading?"Locating…":"📡 Use My Location"}
        </button>
        <span style={{color:C.muted,fontSize:13}}>or</span>
        <input value={zipInput} onChange={e=>setZipInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&zipLocate()} placeholder="Enter ZIP code" maxLength={5}
          style={{border:`1.5px solid ${C.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,width:130,outline:"none"}}/>
        <button onClick={zipLocate} style={{background:C.gold,color:"#fff",border:"none",borderRadius:8,padding:"9px 14px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Search →</button>
        {locLabel&&<span style={{color:C.green,fontSize:13,fontWeight:600}}>✓ Showing results near {locLabel}</span>}
        {locError&&<span style={{color:C.red,fontSize:13}}>{locError}</span>}
        {userLoc&&<button onClick={()=>{setUserLoc(null);setLocLabel("");setZipInput("");setSortBy("rating");}} style={{marginLeft:"auto",background:"none",border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer",color:C.muted}}>✕ Clear</button>}
      </div>
    </div>

    {/* Filters */}
    <div style={{background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:14,padding:"16px 20px",marginBottom:20}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, city, ZIP, or specialty…"
          style={{flex:"2 1 180px",border:`1.5px solid ${C.border}`,borderRadius:8,padding:"9px 13px",fontSize:13,outline:"none"}}/>
        <select value={stateF} onChange={e=>setStateF(e.target.value)} style={sel({flex:"1 1 90px"})}>
          <option value="">All States</option>{STATES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={typeF} onChange={e=>setTypeF(e.target.value)} style={sel({flex:"1 1 110px"})}>
          <option value="">All Types</option>{TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
        <select value={expF} onChange={e=>setExpF(e.target.value)} style={sel({flex:"1 1 110px"})}>
          <option value="">Any Experience</option><option>Expert</option><option>Familiar</option><option>Learning</option>
        </select>
      </div>
      <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}}>
        {[["newOnly",newOnly,setNewOnly,"Accepting New Patients"],["teleOnly",teleOnly,setTeleOnly,"Telehealth Available"]].map(([k,v,fn,lbl])=>(
          <label key={k} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13,color:C.text,fontWeight:500}}>
            <input type="checkbox" checked={v} onChange={e=>fn(e.target.checked)} style={{accentColor:C.navy}}/>{lbl}
          </label>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:C.muted}}>Sort:</span>
          {[["rating","Top Rated"],["distance","Nearest"],["reviews","Most Reviewed"]].map(([v,l])=>(
            <Pill key={v} active={sortBy===v} onClick={()=>setSortBy(v)}>{l}</Pill>
          ))}
          <span style={{fontSize:12,color:C.muted,marginLeft:4}}>{filtered.length} result{filtered.length!==1?"s":""}</span>
        </div>
      </div>
    </div>

    {/* Trust legend */}
    <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:18,alignItems:"center"}}>
      <span style={{fontSize:12,color:C.muted,fontWeight:600}}>Listing status:</span>
      <span style={{fontSize:12,color:C.text,display:"flex",alignItems:"center",gap:4}}><span style={{background:"#dbeafe",color:"#1e40af",borderRadius:20,padding:"1px 8px",fontSize:10,fontWeight:700}}>✓ Verified</span> independently confirmed</span>
      <span style={{fontSize:12,color:C.text,display:"flex",alignItems:"center",gap:4}}><span style={{background:"#f3e8ff",color:"#6b21a8",borderRadius:20,padding:"1px 8px",fontSize:10,fontWeight:700}}>Provider-Listed</span> submitted by office</span>
      <span style={{fontSize:12,color:C.text,display:"flex",alignItems:"center",gap:4}}><span style={{background:C.yellowBg,color:"#92400e",borderRadius:20,padding:"1px 8px",fontSize:10,fontWeight:700}}>⚠ Unverified</span> call ahead</span>
    </div>

    {/* Experience Legend */}
    <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:18,alignItems:"center"}}>
      <span style={{fontSize:12,color:C.muted,fontWeight:600}}>CHAMPVA Experience:</span>
      {Object.entries(EXP).map(([l,c])=><span key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:C.text}}>
        <span style={{width:8,height:8,borderRadius:"50%",background:c.dot,display:"inline-block"}}/><strong>{l}</strong>
      </span>)}
    </div>

    {filtered.length===0
      ? <div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}>
          <div style={{fontSize:40,marginBottom:12}}>🔍</div>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,color:C.text,marginBottom:8}}>No providers found</div>
          <div style={{fontSize:14}}>Try adjusting your filters — or be the first to add one in your area!</div>
        </div>
      : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))",gap:14}}>
          {filtered.map(p=><ProviderCard key={p.id} p={p} dist={p.dist} onSelect={setSelected}/>)}
        </div>
    }

    {/* CTA */}
    <div style={{marginTop:36,background:C.navy,borderRadius:16,padding:"26px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
      <div>
        <div style={{fontFamily:"'DM Serif Display',serif",color:"#fff",fontSize:18,marginBottom:4}}>Know a CHAMPVA Provider?</div>
        <div style={{color:"#94a3b8",fontSize:13}}>Every submission helps a veteran family get the care they've earned.</div>
      </div>
      <button style={{background:C.gold,color:"#fff",border:"none",borderRadius:10,padding:"11px 22px",fontWeight:700,fontSize:14,cursor:"pointer",whiteSpace:"nowrap"}}>➕ Add a Provider</button>
    </div>

    <Modal p={selected} onClose={()=>setSelected(null)}/>
  </>;
}

// ─── Claims Guide Tab ─────────────────────────────────────────────────────────
const CLAIM_STEPS = [
  {
    icon:"📋", title:"Confirm the Claim Type",
    blurb:"Before filing, know which form you need. Most outpatient and medical claims use VA Form 10-7959a. Pharmacy claims use 10-7959c.",
    details:[
      { label:"Medical/Outpatient", form:"VA Form 10-7959a", notes:"Standard claim for doctor visits, specialist care, labs, imaging, mental health." },
      { label:"Inpatient (Hospital)", form:"VA Form 10-7959a", notes:"Same form, but include all UB-04 billing statements from the facility." },
      { label:"Pharmacy", form:"VA Form 10-7959c", notes:"For prescription drugs not filled through a VA pharmacy." },
      { label:"Other Health Insurance (OHI)", form:"VA Form 10-7959b", notes:"File with your OHI first; CHAMPVA pays secondary." },
    ],
    tips:["If you have Medicare or other insurance (OHI), CHAMPVA is secondary — file with primary insurance first and send CHAMPVA the EOB.","Call 1-800-733-8387 if unsure which form applies to your situation."]
  },
  {
    icon:"📄", title:"Gather Your Documents",
    blurb:"Missing documents are the #1 reason CHAMPVA claims are delayed or denied. Collect everything before you mail.",
    checklist:[
      "Completed VA Form 10-7959a (download from va.gov)",
      "Itemized bill from provider (must show procedure codes, dates of service, billed amounts — NOT just a statement)",
      "Explanation of Benefits (EOB) from primary insurance (if you have OHI)",
      "Operative report (for surgeries or procedures)",
      "Physician referral letter (if required for specialist care)",
      "Prescription receipts (for pharmacy claims)",
      "Copy of your CHAMPVA ID card (first claim only, or if requested)",
    ],
    tips:["Never send originals — send copies only and keep originals.","The itemized bill MUST show the provider's tax ID, NPI number, diagnosis codes (ICD-10), and procedure codes (CPT)."]
  },
  {
    icon:"✍️", title:"Complete VA Form 10-7959a",
    blurb:"Take your time with the form. Errors or missing fields cause processing delays.",
    formFields:[
      { field:"Section I", what:"Beneficiary's name, address, date of birth, Social Security Number, relationship to veteran" },
      { field:"Section II", what:"Sponsor (veteran) information — name, SSN, VA file number, branch of service" },
      { field:"Section III", what:"Other Health Insurance (OHI) information — even if you don't have OHI, check 'No'" },
      { field:"Section IV", what:"Medical information — diagnosis, treating provider's name and address, dates of service" },
      { field:"Signature", what:"Beneficiary (or legal guardian) signature and date — the form is invalid without this" },
    ],
    tips:["Download the latest form version at va.gov — old versions are rejected.","Write 'CHAMPVA' and your SSN on each page of all supporting documents."]
  },
  {
    icon:"📬", title:"Submit Your Claim",
    blurb:"CHAMPVA claims are processed by the VA Health Administration Center in Denver. There's no online portal — claims must be mailed or faxed.",
    details:[
      { label:"Mailing Address", form:"VA Health Administration Center", notes:"PO Box 469064 · Denver, CO 80246-9064" },
      { label:"Fax", form:"(303) 331-7808", notes:"Fax is accepted — keep a confirmation sheet for your records." },
      { label:"Deadline", form:"1 Year from Service Date", notes:"Claims must be filed within 1 year of the date of service or discharge." },
    ],
    tips:["Send via USPS Certified Mail with Return Receipt — you'll get proof of delivery.","Keep a complete copy of everything you mail or fax. Label it with the date sent."]
  },
  {
    icon:"🔍", title:"Track Your Claim",
    blurb:"CHAMPVA aims to process most claims within 45 days. Here's how to follow up.",
    details:[
      { label:"Phone", form:"1-800-733-8387", notes:"Mon–Fri, 8:05am–7:30pm ET. Have your SSN and date of service ready." },
      { label:"Online", form:"va.gov portal", notes:"Log in to va.gov to check claim status online." },
      { label:"Timeline", form:"~45 days typical", notes:"Complex or OHI claims may take longer. Call after 60 days if no response." },
    ],
    tips:["After submitting, write down the date and the name of any VA rep you speak to.","If denied, you have the right to appeal — request an itemized denial notice in writing."]
  },
  {
    icon:"📊", title:"Review Your CHAMPVA EOB",
    blurb:"Once processed, CHAMPVA mails you an Explanation of Benefits. Here's how to read it.",
    formFields:[
      { field:"Billed Amount", what:"What your provider charged" },
      { field:"CHAMPVA Allowable", what:"The maximum amount CHAMPVA considers (often the Medicare rate)" },
      { field:"Deductible Applied", what:"Any portion applied to your $50/$100 annual deductible" },
      { field:"CHAMPVA Paid", what:"75% of the allowable amount after deductible — this goes to your provider" },
      { field:"Your Cost Share", what:"25% — what you owe the provider" },
      { field:"Non-Allowable", what:"Amounts over the CHAMPVA allowable — provider cannot bill you more than this if they're CHAMPVA-authorized" },
    ],
    tips:["If the billed amount exceeds the CHAMPVA allowable, you're NOT responsible for the difference with authorized providers.","If denied, review the reason code on the EOB — many denials are fixable with a missing document."]
  },
];

function ClaimsTab() {
  const [step,setStep] = useState(0);
  const s = CLAIM_STEPS[step];
  return <div style={{maxWidth:820,margin:"0 auto"}}>
    <div style={{marginBottom:28}}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:28,color:C.navy,marginBottom:8}}>CHAMPVA Claims Walkthrough</div>
      <p style={{color:C.muted,fontSize:15,margin:0,lineHeight:1.7}}>Filing a CHAMPVA claim doesn't have to be intimidating. Follow these six steps to make sure your claim is complete, submitted correctly, and paid on time.</p>
    </div>
    <div style={{display:"flex",gap:0,marginBottom:24,background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
      {CLAIM_STEPS.map((cs,i)=><button key={i} onClick={()=>setStep(i)} style={{
        flex:1,padding:"12px 4px",border:"none",borderRight:i<CLAIM_STEPS.length-1?`1px solid ${C.border}`:"none",
        background:step===i?C.navy:"#fff",color:step===i?"#fff":i<step?C.green:C.muted,
        cursor:"pointer",fontSize:11,fontWeight:700,transition:"all .15s",textAlign:"center",lineHeight:1.3
      }}>
        <div style={{fontSize:18,marginBottom:3}}>{i<step?"✅":cs.icon}</div>
        <div>{i+1}</div>
      </button>)}
    </div>
    <div style={{background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:16,padding:"28px 26px",marginBottom:20}}>
      <div style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:20}}>
        <div style={{width:52,height:52,background:C.navy,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{s.icon}</div>
        <div>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Step {step+1} of {CLAIM_STEPS.length}</div>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:C.navy,lineHeight:1.2}}>{s.title}</div>
        </div>
      </div>
      <p style={{color:C.text,fontSize:15,lineHeight:1.7,marginBottom:20}}>{s.blurb}</p>
      {s.checklist&&<div style={{marginBottom:20}}>
        <div style={{fontWeight:700,color:C.navy,marginBottom:10,fontSize:14}}>Required Documents Checklist</div>
        {s.checklist.map((item,i)=><label key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8,cursor:"pointer"}}>
          <input type="checkbox" style={{accentColor:C.navy,marginTop:2,flexShrink:0}}/>
          <span style={{fontSize:13,color:C.text,lineHeight:1.5}}>{item}</span>
        </label>)}
      </div>}
      {s.details&&<div style={{marginBottom:20,display:"flex",flexDirection:"column",gap:10}}>
        {s.details.map(d=><div key={d.label} style={{background:C.bg,borderRadius:10,padding:"12px 14px",display:"flex",gap:14,alignItems:"flex-start"}}>
          <div style={{flexShrink:0,minWidth:140}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>{d.label}</div>
            <div style={{fontSize:14,color:C.navy,fontWeight:700,marginTop:2}}>{d.form}</div>
          </div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.5,paddingTop:2}}>{d.notes}</div>
        </div>)}
      </div>}
      {s.formFields&&<div style={{marginBottom:20}}>
        {s.formFields.map(f=><div key={f.field} style={{display:"flex",gap:14,borderBottom:`1px solid ${C.border}`,padding:"10px 0",alignItems:"flex-start"}}>
          <div style={{minWidth:130,fontSize:13,fontWeight:700,color:C.navy,flexShrink:0}}>{f.field}</div>
          <div style={{fontSize:13,color:C.text,lineHeight:1.5}}>{f.what}</div>
        </div>)}
      </div>}
      {s.tips&&<div style={{background:"#fffbeb",borderRadius:12,padding:"14px 16px",borderLeft:`3px solid ${C.gold}`}}>
        <div style={{fontSize:12,color:"#92400e",fontWeight:700,marginBottom:8}}>💡 Pro Tips</div>
        {s.tips.map((t,i)=><div key={i} style={{fontSize:13,color:C.text,lineHeight:1.6,marginBottom:i<s.tips.length-1?6:0}}>• {t}</div>)}
      </div>}
    </div>
    <div style={{display:"flex",gap:10,justifyContent:"space-between"}}>
      <button onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0} style={{background:step===0?"#f3f4f6":C.bg,color:step===0?C.subtle:C.navy,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"11px 20px",fontWeight:700,fontSize:14,cursor:step===0?"not-allowed":"pointer"}}>← Previous</button>
      {step<CLAIM_STEPS.length-1
        ? <button onClick={()=>setStep(s=>s+1)} style={{background:C.navy,color:"#fff",border:"none",borderRadius:10,padding:"11px 24px",fontWeight:700,fontSize:14,cursor:"pointer"}}>Next Step →</button>
        : <div style={{background:C.greenBg,color:"#166534",borderRadius:10,padding:"11px 20px",fontWeight:700,fontSize:14}}>🎉 You've completed the walkthrough!</div>
      }
    </div>
  </div>;
}

// ─── Cost Estimator Tab ───────────────────────────────────────────────────────
const PROCEDURE_EXAMPLES = [
  { label:"Primary Care Visit", avg:250 },
  { label:"Specialist Consultation", avg:450 },
  { label:"Mental Health Session (60 min)", avg:180 },
  { label:"Emergency Room Visit", avg:2800 },
  { label:"Urgent Care Visit", avg:200 },
  { label:"Lab Work (basic panel)", avg:180 },
  { label:"X-Ray", avg:320 },
  { label:"MRI (without contrast)", avg:1400 },
  { label:"Outpatient Surgery", avg:6500 },
  { label:"Physical Therapy Session", avg:150 },
  { label:"Childbirth (vaginal)", avg:12000 },
  { label:"Custom amount", avg:0 },
];

function CostTab() {
  const [procedure,setProcedure]   = useState(PROCEDURE_EXAMPLES[0]);
  const [billed,setBilled]         = useState(250);
  const [customBilled,setCustom]   = useState("");
  const [coverage,setCoverage]     = useState("individual");
  const [deductMet,setDeductMet]   = useState("no");
  const [deductPaid,setDeductPaid] = useState(0);
  const [capUsed,setCapUsed]       = useState(0);
  const [hasOHI,setHasOHI]         = useState(false);
  const [ohiPaid,setOhiPaid]       = useState(0);

  const actualBilled = procedure.label==="Custom amount" ? (parseFloat(customBilled)||0) : billed;
  const deductible   = coverage==="individual" ? INDIV_DEDUCTIBLE : FAMILY_DEDUCTIBLE;
  const deductRemaining = deductMet==="yes" ? 0 : deductMet==="partial" ? Math.max(0,deductible-deductPaid) : deductible;
  const billedAfterOHI = hasOHI ? Math.max(0,actualBilled-ohiPaid) : actualBilled;
  const allowable      = billedAfterOHI;
  const afterDeduct    = Math.max(0, allowable - deductRemaining);
  const deductApplied  = Math.min(allowable, deductRemaining);
  const champvaPays    = afterDeduct * CHAMPVA_RATE;
  const yourShare      = afterDeduct * (1-CHAMPVA_RATE);
  const totalYouPay    = deductApplied + yourShare;
  const capAfter       = Math.min(CATASTROPHIC_CAP, capUsed + yourShare);
  const capRemaining   = CATASTROPHIC_CAP - capAfter;

  const Row = ({label,value,sub,highlight}) => <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
    <div>
      <div style={{fontSize:14,color:highlight?C.navy:C.text,fontWeight:highlight?700:400}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:C.subtle,marginTop:2}}>{sub}</div>}
    </div>
    <div style={{fontSize:15,fontWeight:700,color:highlight==="green"?C.green:highlight==="red"?C.red:highlight==="gold"?C.gold:C.navy}}>{value}</div>
  </div>;

  const inS = {width:"100%",border:`1.5px solid ${C.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box"};

  return <div style={{maxWidth:820,margin:"0 auto"}}>
    <div style={{marginBottom:28}}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:28,color:C.navy,marginBottom:8}}>CHAMPVA Cost Estimator</div>
      <p style={{color:C.muted,fontSize:15,margin:0,lineHeight:1.7}}>Estimate your out-of-pocket costs before your appointment.</p>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Section title="Service Details">
          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:700,color:C.muted,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Procedure Type</label>
            <select value={procedure.label} onChange={e=>{const p=PROCEDURE_EXAMPLES.find(x=>x.label===e.target.value);setProcedure(p);if(p.avg)setBilled(p.avg);}}
              style={{...inS,appearance:"none"}}>
              {PROCEDURE_EXAMPLES.map(p=><option key={p.label}>{p.label}</option>)}
            </select>
          </div>
          {procedure.label==="Custom amount"
            ? <div>
                <label style={{fontSize:12,fontWeight:700,color:C.muted,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Billed Amount ($)</label>
                <input type="number" value={customBilled} onChange={e=>setCustom(e.target.value)} placeholder="e.g. 1500" style={inS}/>
              </div>
            : <div style={{background:C.bg,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.muted}}>
                Typical billed amount: <strong style={{color:C.navy}}>{fmt$(billed)}</strong>
              </div>}
        </Section>
        <Section title="Your Coverage">
          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:700,color:C.muted,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Coverage Type</label>
            <div style={{display:"flex",gap:8}}>
              {[["individual","Individual ($50 ded.)"],["family","Family ($100 ded.)"]].map(([v,l])=>(
                <button key={v} onClick={()=>setCoverage(v)} style={{flex:1,padding:"9px 8px",borderRadius:8,border:`1.5px solid ${coverage===v?C.navy:C.border}`,background:coverage===v?C.navy:"#fff",color:coverage===v?"#fff":C.text,fontSize:12,fontWeight:600,cursor:"pointer"}}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:700,color:C.muted,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Deductible Status</label>
            <div style={{display:"flex",gap:8}}>
              {[["no","Not Met"],["partial","Partial"],["yes","Fully Met"]].map(([v,l])=>(
                <button key={v} onClick={()=>setDeductMet(v)} style={{flex:1,padding:"9px 4px",borderRadius:8,border:`1.5px solid ${deductMet===v?C.navy:C.border}`,background:deductMet===v?C.navy:"#fff",color:deductMet===v?"#fff":C.text,fontSize:12,fontWeight:600,cursor:"pointer"}}>{l}</button>
              ))}
            </div>
            {deductMet==="partial"&&<div style={{marginTop:8}}>
              <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Amount already paid toward deductible</label>
              <input type="number" value={deductPaid} onChange={e=>setDeductPaid(Math.min(deductible,parseFloat(e.target.value)||0))} max={deductible} style={inS}/>
            </div>}
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:700,color:C.muted,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Out-of-Pocket This Year (toward $3,000 cap)</label>
            <input type="number" value={capUsed} onChange={e=>setCapUsed(Math.min(CATASTROPHIC_CAP,parseFloat(e.target.value)||0))} max={3000} style={inS}/>
          </div>
        </Section>
        <Section title="Other Health Insurance (OHI)">
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:hasOHI?12:0}}>
            <input type="checkbox" checked={hasOHI} onChange={e=>setHasOHI(e.target.checked)} style={{accentColor:C.navy}}/>
            <span style={{fontSize:13,color:C.text}}>I have other health insurance</span>
          </label>
          {hasOHI&&<div>
            <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Amount your primary insurance pays</label>
            <input type="number" value={ohiPaid} onChange={e=>setOhiPaid(parseFloat(e.target.value)||0)} style={inS}/>
          </div>}
        </Section>
      </div>
      <div>
        <Section title="Your Estimated Costs" style={{position:"sticky",top:16}}>
          <div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyLight} 100%)`,borderRadius:14,padding:"22px 20px",marginBottom:20,textAlign:"center"}}>
            <div style={{fontSize:12,color:"rgba(255,255,255,.6)",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Your Estimated Out-of-Pocket</div>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:44,color:"#fff",lineHeight:1}}>{fmt$(Math.max(0,totalYouPay))}</div>
          </div>
          <Row label="Provider's Billed Amount" value={fmt$(actualBilled)}/>
          {hasOHI&&<Row label="Primary Insurance Pays" value={`−${fmt$(ohiPaid)}`} highlight="green"/>}
          <Row label="CHAMPVA Allowable" value={fmt$(allowable)} sub="Maximum CHAMPVA will consider"/>
          {deductApplied>0&&<Row label="Deductible Applied" value={`−${fmt$(deductApplied)}`} highlight="red"/>}
          <Row label="CHAMPVA Pays (75%)" value={fmt$(champvaPays)} highlight="green"/>
          <Row label="Your Cost-Share (25%)" value={fmt$(yourShare)} highlight="red"/>
          <Row label="Total You Owe Provider" value={fmt$(Math.max(0,totalYouPay))} highlight="red"/>
          <div style={{background:C.bg,borderRadius:12,padding:"14px 14px",marginTop:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:8}}>📊 Annual Cap Progress</div>
            <div style={{background:C.border,borderRadius:100,height:8,marginBottom:6}}>
              <div style={{background:capAfter>=CATASTROPHIC_CAP?C.green:C.gold,height:8,borderRadius:100,width:`${Math.min(100,(capAfter/CATASTROPHIC_CAP)*100)}%`,transition:"width .4s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted}}>
              <span>{fmt$(capAfter)} used</span><span>{fmt$(capRemaining)} remaining of $3,000 cap</span>
            </div>
          </div>
          <div style={{background:"#fffbeb",borderRadius:12,padding:"12px 14px",marginTop:12,borderLeft:`3px solid ${C.gold}`}}>
            <div style={{fontSize:11,color:"#92400e",fontWeight:700,marginBottom:4}}>⚠️ Disclaimer</div>
            <div style={{fontSize:11,color:C.text,lineHeight:1.5}}>This is an estimate only. Actual payments depend on CHAMPVA's approved allowable amount. Confirm with CHAMPVA at 1-800-733-8387.</div>
          </div>
        </Section>
      </div>
    </div>
  </div>;
}

// ─── AI Assistant Tab ─────────────────────────────────────────────────────────
const SUGGESTED_QUESTIONS = [
  "Am I eligible for CHAMPVA?",
  "Does CHAMPVA cover mental health therapy?",
  "How do I file a claim if I also have Medicare?",
  "What's the CHAMPVA catastrophic cap?",
  "Does CHAMPVA cover prescription drugs?",
  "Can my children use CHAMPVA after age 18?",
];

function AITab() {
  const [messages,setMessages] = useState([]);
  const [input,setInput]       = useState("");
  const [loading,setLoading]   = useState(false);
  const bottomRef              = useRef(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  const send = useCallback(async(text)=>{
    const q = text||input.trim();
    if(!q||loading) return;
    setInput("");
    const history = [...messages,{role:"user",content:q}];
    setMessages(history);
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:1000,
          system:`You are a knowledgeable and compassionate CHAMPVA benefits advisor helping veteran families understand and use their CHAMPVA health coverage. CHAMPVA (Civilian Health and Medical Program of the Department of Veterans Affairs) covers eligible dependents and survivors of certain veterans. Key facts: Annual deductible $50/individual or $100/family. CHAMPVA pays 75%, beneficiary pays 25%. Catastrophic cap $3,000/family per year. Payer ID: 84146. Claims phone: 1-800-733-8387 Mon-Fri 8:05am-7:30pm ET. Mail claims to VA Health Administration Center PO Box 469064 Denver CO 80246-9064. Claims use VA Form 10-7959a; pharmacy uses 10-7959c. CHAMPVA is secondary to Medicare and most private insurance. Claims must be filed within 1 year of date of service. Be warm, clear, and specific. Avoid jargon. Always remind them official guidance comes from va.gov or the CHAMPVA helpline.`,
          messages:history.map(m=>({role:m.role,content:m.content}))
        })
      });
      const d = await res.json();
      const reply = d.content?.find(b=>b.type==="text")?.text || "Sorry, I couldn't get a response. Please try again.";
      setMessages(prev=>[...prev,{role:"assistant",content:reply}]);
    } catch {
      setMessages(prev=>[...prev,{role:"assistant",content:"I'm having trouble connecting right now. Please try again, or call CHAMPVA directly at 1-800-733-8387."}]);
    }
    setLoading(false);
  },[input,messages,loading]);

  return <div style={{maxWidth:740,margin:"0 auto"}}>
    <div style={{marginBottom:24}}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:28,color:C.navy,marginBottom:8}}>CHAMPVA Benefits Assistant</div>
      <p style={{color:C.muted,fontSize:15,margin:0,lineHeight:1.7}}>Ask anything about your CHAMPVA coverage — eligibility, claims, what's covered, or how to use your benefits.</p>
    </div>
    {messages.length===0&&<div style={{marginBottom:20}}>
      <div style={{fontSize:12,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Suggested Questions</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {SUGGESTED_QUESTIONS.map(q=><button key={q} onClick={()=>send(q)} style={{background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:20,padding:"7px 14px",fontSize:13,color:C.navy,cursor:"pointer",fontWeight:500}}>{q}</button>)}
      </div>
    </div>}
    <div style={{background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:16,overflow:"hidden"}}>
      <div style={{padding:"16px 18px",minHeight:300,maxHeight:420,overflowY:"auto",display:"flex",flexDirection:"column",gap:14}}>
        {messages.length===0&&<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",color:C.subtle,padding:24}}>
          <div>
            <div style={{fontSize:36,marginBottom:12}}>⚕️</div>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:18,color:C.navy,marginBottom:6}}>Your CHAMPVA questions, answered</div>
            <div style={{fontSize:13}}>Powered by AI · Always verify important decisions with CHAMPVA directly</div>
          </div>
        </div>}
        {messages.map((m,i)=><div key={i} style={{display:"flex",gap:10,justifyContent:m.role==="user"?"flex-end":"flex-start",alignItems:"flex-start"}}>
          {m.role==="assistant"&&<div style={{width:32,height:32,background:C.navy,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>⚕️</div>}
          <div style={{background:m.role==="user"?C.navy:"#f8fafc",color:m.role==="user"?"#fff":C.text,borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",padding:"12px 15px",maxWidth:"80%",fontSize:13,lineHeight:1.65,whiteSpace:"pre-wrap"}}>
            {m.content}
          </div>
        </div>)}
        {loading&&<div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <div style={{width:32,height:32,background:C.navy,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⚕️</div>
          <div style={{background:"#f8fafc",borderRadius:"18px 18px 18px 4px",padding:"12px 15px"}}>
            <div style={{display:"flex",gap:4}}>
              {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.muted,animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}
            </div>
          </div>
        </div>}
        <div ref={bottomRef}/>
      </div>
      <div style={{borderTop:`1px solid ${C.border}`,padding:"12px 14px",display:"flex",gap:10}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
          placeholder="Ask about CHAMPVA coverage, claims, eligibility…"
          style={{flex:1,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 13px",fontSize:13,outline:"none"}}/>
        <button onClick={()=>send()} disabled={!input.trim()||loading} style={{background:input.trim()&&!loading?C.navy:"#e5e7eb",color:input.trim()&&!loading?"#fff":C.subtle,border:"none",borderRadius:10,padding:"10px 18px",fontWeight:700,fontSize:13,cursor:input.trim()&&!loading?"pointer":"not-allowed"}}>Send</button>
      </div>
    </div>
    <div style={{textAlign:"center",fontSize:11,color:C.subtle,marginTop:10}}>AI responses are informational only. For official guidance, call CHAMPVA at 1-800-733-8387 or visit va.gov.</div>
    <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
  </div>;
}

// ─── Submit Tab (with required fields + validation) ───────────────────────────
function SubmitTab() {
  const [submitted,setSubmitted] = useState(false);
  const [errors,setErrors]       = useState({});
  const [form,setForm]           = useState({
    name:"", address:"", city:"", state:"", zip:"", phone:"",
    type:"", experience:"", notes:"",
    acceptingNew:false, telehealth:false, multilingual:false,
    rating:0, submitterName:"", submitterEmail:""
  });
  const [hoveredStar,setHoveredStar] = useState(0);

  const set = (k,v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:""})); };

  const validate = () => {
    const e = {};
    if (!form.name.trim())           e.name           = "Provider name is required";
    if (!form.address.trim())        e.address        = "Address is required";
    if (!form.city.trim())           e.city           = "City is required";
    if (!form.state)                 e.state          = "State is required";
    if (!form.zip.trim())            e.zip            = "ZIP code is required";
    if (!form.phone.trim())          e.phone          = "Phone number is required";
    if (!form.type)                  e.type           = "Provider type is required";
    if (!form.experience)            e.experience     = "Please select a CHAMPVA experience level";
    if (!form.rating)                e.rating         = "Please provide a star rating";
    if (!form.submitterName.trim())  e.submitterName  = "Your name is required";
    if (!form.submitterEmail.trim()) e.submitterEmail = "Your email is required";
    else if (!/\S+@\S+\.\S+/.test(form.submitterEmail)) e.submitterEmail = "Please enter a valid email";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitted(true);
  };

  if(submitted) return <div style={{maxWidth:560,margin:"60px auto",textAlign:"center"}}>
    <div style={{fontSize:48,marginBottom:16}}>🎖️</div>
    <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:C.navy,marginBottom:8}}>Thank You for Contributing</div>
    <p style={{color:C.muted,fontSize:15,lineHeight:1.7}}>Your submission helps other veteran families find providers they can trust. We'll review it before it goes live.</p>
    <button onClick={()=>{setSubmitted(false);setForm({name:"",address:"",city:"",state:"",zip:"",phone:"",type:"",experience:"",notes:"",acceptingNew:false,telehealth:false,multilingual:false,rating:0,submitterName:"",submitterEmail:""});setErrors({});}} style={{marginTop:20,background:C.navy,color:"#fff",border:"none",borderRadius:10,padding:"12px 24px",fontWeight:700,fontSize:14,cursor:"pointer"}}>Submit Another</button>
  </div>;

  const inStyle = k => ({width:"100%",border:`1.5px solid ${errors[k]?C.red:C.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",outline:"none"});
  const Err = ({k}) => errors[k] ? <div style={{color:C.red,fontSize:11,marginTop:3}}>⚠ {errors[k]}</div> : null;
  const Req = () => <span style={{color:C.red,marginLeft:2}}>*</span>;

  return <div style={{maxWidth:640,margin:"0 auto"}}>
    <div style={{fontFamily:"'DM Serif Display',serif",fontSize:28,color:C.navy,marginBottom:8}}>Add a Provider</div>
    <p style={{color:C.muted,fontSize:15,marginBottom:6}}>Help veteran families by sharing a provider you've used with CHAMPVA.</p>
    <p style={{color:C.muted,fontSize:13,marginBottom:28}}>Fields marked <span style={{color:C.red}}>*</span> are required. Your contact info is never displayed publicly.</p>
    <Section>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>

        {/* Provider info */}
        {[
          ["name","Practice / Provider Name","e.g. Riverside Family Medicine"],
          ["address","Street Address","123 Main St"],
          ["city","City","City"],
          ["phone","Phone Number","(555) 000-0000"],
          ["zip","ZIP Code","00000"],
        ].map(([k,l,p])=>(
          <div key={k}>
            <label style={{fontSize:12,fontWeight:700,color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>{l}<Req/></label>
            <input value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={p} style={inStyle(k)}/>
            <Err k={k}/>
          </div>
        ))}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div>
            <label style={{fontSize:12,fontWeight:700,color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>State<Req/></label>
            <select value={form.state} onChange={e=>set("state",e.target.value)} style={{...inStyle("state"),appearance:"none"}}>
              <option value="">Select state</option>
              {ALL_STATES.map(s=><option key={s}>{s}</option>)}
            </select>
            <Err k="state"/>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:700,color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Provider Type<Req/></label>
            <select value={form.type} onChange={e=>set("type",e.target.value)} style={{...inStyle("type"),appearance:"none"}}>
              <option value="">Select type</option>
              {ALL_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
            <Err k="type"/>
          </div>
        </div>

        {/* Experience */}
        <div>
          <label style={{fontSize:12,fontWeight:700,color:C.muted,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>CHAMPVA Experience Level<Req/></label>
          <div style={{display:"flex",gap:8}}>
            {Object.entries(EXP).map(([l,c])=><button key={l} onClick={()=>set("experience",l)} style={{flex:1,background:form.experience===l?c.bg:"#fff",color:form.experience===l?c.text:C.muted,border:`1.5px solid ${form.experience===l?c.dot:C.border}`,borderRadius:10,padding:"10px 8px",textAlign:"center",cursor:"pointer",fontSize:12,fontWeight:700,transition:"all .15s"}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:c.dot,margin:"0 auto 4px"}}/>{l}
            </button>)}
          </div>
          <Err k="experience"/>
        </div>

        {/* Notes */}
        <div>
          <label style={{fontSize:12,fontWeight:700,color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Your Experience (Community Notes)</label>
          <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="What should other veteran families know? Billing ease, staff knowledge, wait times, etc." rows={4} style={{...inStyle("notes"),resize:"vertical",lineHeight:1.6}}/>
        </div>

        {/* Checkboxes */}
        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
          {[["acceptingNew","Accepting new CHAMPVA patients"],["telehealth","Telehealth available"],["multilingual","Multilingual staff"]].map(([k,l])=>(
            <label key={k} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13,color:C.text}}>
              <input type="checkbox" checked={form[k]} onChange={e=>set(k,e.target.checked)} style={{accentColor:C.navy}}/>{l}
            </label>
          ))}
        </div>

        {/* Star Rating */}
        <div>
          <label style={{fontSize:12,fontWeight:700,color:C.muted,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Your Rating<Req/></label>
          <div style={{display:"flex",gap:4}}>
            {[1,2,3,4,5].map(n=><button key={n} onMouseEnter={()=>setHoveredStar(n)} onMouseLeave={()=>setHoveredStar(0)} onClick={()=>set("rating",n)}
              style={{width:40,height:40,borderRadius:8,border:`1.5px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",color:n<=(hoveredStar||form.rating)?C.gold:"#d1d5db",transition:"color .1s"}}>★</button>)}
            {form.rating>0&&<span style={{alignSelf:"center",fontSize:13,color:C.muted,marginLeft:6}}>{["","Poor","Fair","Good","Very Good","Excellent"][form.rating]}</span>}
          </div>
          <Err k="rating"/>
        </div>

        {/* Divider */}
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:12}}>About You (not displayed publicly)</div>
          {[["submitterName","Your Name","First and last name"],["submitterEmail","Your Email","email@example.com"]].map(([k,l,p])=>(
            <div key={k} style={{marginBottom:12}}>
              <label style={{fontSize:12,fontWeight:700,color:C.muted,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>{l}<Req/></label>
              <input value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={p} type={k==="submitterEmail"?"email":"text"} style={inStyle(k)}/>
              <Err k={k}/>
            </div>
          ))}
          <div style={{background:C.bg,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.muted,lineHeight:1.5}}>
            🔒 Your name and email are used for follow-up verification only and will never appear on the site.
          </div>
        </div>

        {Object.keys(errors).length>0&&<div style={{background:C.redBg,borderRadius:10,padding:"12px 14px",fontSize:13,color:C.red,fontWeight:600}}>
          Please fix the errors above before submitting.
        </div>}

        <button onClick={handleSubmit} style={{background:C.navy,color:"#fff",border:"none",borderRadius:10,padding:"13px 0",fontWeight:700,fontSize:15,cursor:"pointer"}}>
          Submit Provider →
        </button>
        <p style={{fontSize:12,color:C.subtle,textAlign:"center",margin:0}}>All submissions are reviewed before going live. Thank you for helping the veteran community.</p>
      </div>
    </Section>
  </div>;
}

// ─── App Shell ────────────────────────────────────────────────────────────────
const TABS = [
  {id:"find",   icon:"🔍", label:"Find Providers"},
  {id:"claims", icon:"📋", label:"Claims Guide"},
  {id:"cost",   icon:"💰", label:"Cost Estimator"},
  {id:"ai",     icon:"⚕️",  label:"Ask AI"},
  {id:"submit", icon:"➕", label:"Add Provider"},
];

export default function App() {
  const [tab,setTab] = useState("find");
  return <div style={{fontFamily:"'Source Sans 3',sans-serif",background:C.bg,minHeight:"100vh"}}>
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    <div style={{background:C.navy,borderBottom:"3px solid #C9952A"}}>
      <div style={{maxWidth:1160,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:60}}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <div style={{width:36,height:36,background:C.gold,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>⚕️</div>
          <div>
            <div style={{fontFamily:"'DM Serif Display',serif",color:"#fff",fontSize:17,lineHeight:1}}>CHAMPVA Finder</div>
            <div style={{color:"rgba(255,255,255,.45)",fontSize:10,letterSpacing:.5}}>Provider Directory for Veterans & Families</div>
          </div>
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{
            background:tab===t.id?"#C9952A":"rgba(255,255,255,.07)",color:"#fff",border:"none",borderRadius:8,
            padding:"7px 11px",fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4,transition:"background .15s"
          }}><span>{t.icon}</span><span>{t.label}</span></button>)}
        </div>
      </div>
    </div>
    {tab==="find"&&<div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyLight} 100%)`,padding:"40px 24px 32px"}}>
      <div style={{maxWidth:1160,margin:"0 auto",textAlign:"center"}}>
        <div style={{display:"inline-block",background:C.gold,color:"#fff",borderRadius:20,padding:"3px 14px",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:14}}>Free · Community-Powered · Veteran Focused</div>
        <h1 style={{fontFamily:"'DM Serif Display',serif",color:"#fff",fontSize:"clamp(24px,4vw,42px)",margin:"0 0 12px",lineHeight:1.15}}>
          Find CHAMPVA Providers<br/><span style={{color:C.goldLight}}>Who Actually Know How to Use It</span>
        </h1>
        <p style={{color:"rgba(255,255,255,.6)",fontSize:15,margin:0,lineHeight:1.7,maxWidth:560,marginLeft:"auto",marginRight:"auto"}}>
          Real providers submitted by real veteran families. Search by ZIP, filter by specialty, and find offices with verified CHAMPVA billing experience.
        </p>
      </div>
    </div>}
    {tab!=="find"&&<div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyLight} 100%)`,padding:"28px 24px 22px"}}>
      <div style={{maxWidth:1160,margin:"0 auto"}}>
        <div style={{fontFamily:"'DM Serif Display',serif",color:"#fff",fontSize:22}}>
          {TABS.find(t=>t.id===tab)?.icon} {TABS.find(t=>t.id===tab)?.label}
        </div>
      </div>
    </div>}
    <div style={{maxWidth:1160,margin:"0 auto",padding:"28px 24px 60px"}}>
      {tab==="find"  &&<FindTab/>}
      {tab==="claims"&&<ClaimsTab/>}
      {tab==="cost"  &&<CostTab/>}
      {tab==="ai"    &&<AITab/>}
      {tab==="submit"&&<SubmitTab/>}
    </div>
    <div style={{background:C.navy,padding:"24px",textAlign:"center"}}>
      <div style={{fontFamily:"'DM Serif Display',serif",color:C.gold,fontSize:15,marginBottom:6}}>CHAMPVA Finder</div>
      <div style={{color:"#475569",fontSize:12,lineHeight:1.8}}>
        A community resource for veteran families. Not affiliated with the U.S. Department of Veterans Affairs.<br/>
        For official information: <a href="https://www.va.gov" target="_blank" rel="noreferrer" style={{color:"#94a3b8"}}>va.gov</a> · CHAMPVA: 1-800-733-8387
      </div>
    </div>
  </div>;
}
