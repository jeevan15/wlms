const db = require('./db');
const bcrypt = require('bcryptjs');

// ── Clear all data ────────────────────────────────────────────────────────────
db.exec('PRAGMA foreign_keys = OFF');
db.exec(`
  DELETE FROM notifications; DELETE FROM checklist_item_completions;
  DELETE FROM checklist_completions; DELETE FROM checklist_items;
  DELETE FROM checklists; DELETE FROM compliance_categories;
  DELETE FROM incidents; DELETE FROM sops;
  DELETE FROM tasks; DELETE FROM quiz_attempts;
  DELETE FROM user_progress; DELETE FROM quiz_options;
  DELETE FROM quiz_questions; DELETE FROM lessons;
  DELETE FROM role_courses; DELETE FROM courses;
  DELETE FROM users; DELETE FROM job_roles;
  DELETE FROM sqlite_sequence;
`);
db.exec('PRAGMA foreign_keys = ON');
console.log('Seeding database...');

// ── Job Roles ─────────────────────────────────────────────────────────────────
const ir = db.prepare(`INSERT INTO job_roles (name, color, description) VALUES (?, ?, ?)`);
const workerRoleId     = ir.run('Worker',       '#3B82F6', 'General warehouse floor worker. Induction + Toolbox Training required.').lastInsertRowid;
const supervisorRoleId = ir.run('Supervisor',   '#10B981', 'Team leader overseeing day-to-day operations. All modules required.').lastInsertRowid;
const managerRoleId    = ir.run('Manager',      '#F59E0B', 'Site or department manager. Full compliance access.').lastInsertRowid;
const officeRoleId     = ir.run('Office Staff', '#6B7280', 'Administrative and support staff. Induction required.').lastInsertRowid;

// ── Users ─────────────────────────────────────────────────────────────────────
const ah = bcrypt.hashSync('admin123', 10), uh = bcrypt.hashSync('user123', 10);
const iu = db.prepare(`INSERT INTO users (name, email, password, role, department, job_role_id) VALUES (?, ?, ?, ?, ?, ?)`);
iu.run('Admin User',     'admin@warehouse.com',       ah, 'admin', 'Management',          null);
const u1 = iu.run('John Smith',    'john.smith@warehouse.com',  uh, 'user',  'Receiving',           workerRoleId).lastInsertRowid;
const u2 = iu.run('Sarah Johnson', 'sarah.j@warehouse.com',     uh, 'user',  'Dispatch',            workerRoleId).lastInsertRowid;
const u3 = iu.run('Mike Torres',   'mike.t@warehouse.com',      uh, 'user',  'Inventory',           supervisorRoleId).lastInsertRowid;
const u4 = iu.run('Emma Wilson',   'emma.w@warehouse.com',      uh, 'user',  'Forklift Operations', workerRoleId).lastInsertRowid;
const u5 = iu.run('David Chen',    'david.c@warehouse.com',     uh, 'user',  'Management',          managerRoleId).lastInsertRowid;
const u6 = iu.run('Lisa Park',     'lisa.p@warehouse.com',      uh, 'user',  'Administration',      officeRoleId).lastInsertRowid;

// ── Courses ───────────────────────────────────────────────────────────────────
const ic = db.prepare(`INSERT INTO courses (title, description, category, color, icon) VALUES (?, ?, ?, ?, ?)`);
const inductionId = ic.run('Induction Training','Your essential guide to getting started at our warehouse. Covers company policies, safety fundamentals, emergency procedures, and workplace conduct.','Induction','#7C3AED','building').lastInsertRowid;
const toolboxId   = ic.run('Toolbox Training','Hands-on safety training for warehouse operations. Covers PPE, forklift safety, hazardous materials, loading dock procedures, and first aid.','Safety','#DC2626','tool').lastInsertRowid;

const irc = db.prepare(`INSERT INTO role_courses (role_id, course_id) VALUES (?, ?)`);
[workerRoleId, supervisorRoleId, managerRoleId].forEach(r => { irc.run(r, inductionId); irc.run(r, toolboxId); });
irc.run(officeRoleId, inductionId);

// ── Lessons ───────────────────────────────────────────────────────────────────
const il = db.prepare(`INSERT INTO lessons (course_id, title, content, duration, order_index, has_quiz) VALUES (?, ?, ?, ?, ?, ?)`);
const iLessons = [
  [inductionId,'Welcome & Company Overview','<h2>Welcome to the Team!</h2><p>We\'re delighted to have you join our warehouse family. This module gives you a comprehensive overview of our company, its values, and what we expect from every team member.</p><h3>Our Company Mission</h3><p>We are committed to delivering excellence in logistics and warehousing, ensuring every product reaches its destination safely, on time, and in perfect condition.</p><h3>Core Values</h3><ul><li><strong>Safety First</strong> — The wellbeing of our team is our number one priority.</li><li><strong>Integrity</strong> — We do what we say, and we say what we mean.</li><li><strong>Teamwork</strong> — We succeed together as one cohesive unit.</li></ul><h3>Site Layout</h3><p>Our facility spans 50,000m² divided into: Receiving Bay (Zone A), Storage Racking (Zones B–D), Pick & Pack (Zone E), Dispatch (Zone F), and Staff Amenities (Zone G).</p>','3:45',1,0],
  [inductionId,'Health & Safety Fundamentals','<h2>Health & Safety Fundamentals</h2><p>Health and safety is not just a legal requirement — it is our moral duty to ensure everyone goes home safe every shift.</p><h3>Your Responsibilities</h3><ul><li>Follow all safety instructions at all times.</li><li>Wear appropriate PPE in designated areas.</li><li>Report hazards, near-misses, and incidents immediately.</li><li>Never operate equipment you haven\'t been trained to use.</li><li>Keep your work area clean and free of obstructions.</li></ul><h3>Manual Handling</h3><p>Maximum recommended weight: <strong>25kg for men, 16kg for women</strong>. Use mechanical assistance for heavier loads. Always bend your knees and keep your back straight.</p>','5:20',2,0],
  [inductionId,'Emergency Procedures','<h2>Emergency Procedures</h2><p>Knowing what to do in an emergency can save lives. Familiarise yourself before your first shift.</p><h3>Fire Emergency</h3><ol><li>Activate the nearest fire alarm pull station.</li><li>Evacuate immediately — no personal belongings.</li><li>Use the nearest clearly marked emergency exit.</li><li><strong>Never use lifts</strong> during a fire emergency.</li><li>Proceed to your designated Muster Point.</li><li>Wait for roll call from the Fire Warden.</li></ol><h3>Medical Emergency</h3><ol><li>Call 000 immediately.</li><li>Do not move an injured person unless in immediate danger.</li><li>Contact the nearest First Aid Officer.</li></ol><h3>Emergency Contacts</h3><ul><li>Emergency: 000 | Site Emergency: Ext. 911 | Safety Officer: Ext. 201</li></ul>','4:10',3,0],
  [inductionId,'Workplace Conduct & HR Policies','<h2>Workplace Conduct & HR Policies</h2><p>We are committed to a safe, respectful, and productive workplace for everyone.</p><h3>Code of Conduct</h3><ul><li>Treat all colleagues, visitors, and customers with respect.</li><li>Arrive on time and ready to work.</li><li>Follow all company policies and procedures.</li><li>Maintain confidentiality of company and customer information.</li></ul><h3>Anti-Discrimination Policy</h3><p>Zero-tolerance for discrimination, bullying, and harassment. Any breach results in disciplinary action, up to and including termination.</p><h3>Drug & Alcohol Policy</h3><p>Working under the influence is strictly prohibited and grounds for immediate dismissal. Random testing may be conducted.</p>','4:55',4,0],
  [inductionId,'Site Security & Access Control','<h2>Site Security & Access Control</h2><p>Maintaining site security protects our people, products, and business.</p><h3>Access Cards</h3><ul><li>Carry your access card at all times on site.</li><li>Never share or lend your card.</li><li>Report lost/stolen cards to security immediately.</li></ul><h3>CCTV</h3><p>CCTV cameras operate 24/7 throughout the facility. Footage may be reviewed for safety investigations or operational purposes.</p>','3:30',5,0],
  [inductionId,'Induction Assessment','<h2>Induction Assessment</h2><p>Complete this assessment with a score of at least <strong>70%</strong> to be cleared for on-site work. You may retake if you do not pass first time.</p>','6:00',6,1],
  [toolboxId,'Personal Protective Equipment (PPE)','<h2>Personal Protective Equipment</h2><p>PPE is your last line of defence against workplace injury. Wearing the right PPE in the right areas is mandatory.</p><h3>Mandatory PPE on the Warehouse Floor</h3><ul><li><strong>Safety boots</strong> — required in all operational areas.</li><li><strong>Hi-vis vest</strong> — must be worn at all times in the warehouse.</li><li><strong>Hard hat</strong> — required in loading dock and racking areas.</li><li><strong>Safety glasses</strong> — when handling sharp or particulate materials.</li><li><strong>Gloves</strong> — when handling rough, sharp, or chemical materials.</li></ul><h3>PPE Care</h3><p>Inspect PPE before each shift. Replace damaged PPE immediately. Report defects to your supervisor.</p>','4:20',1,0],
  [toolboxId,'Forklift & MHE Safety','<h2>Forklift & Material Handling Equipment Safety</h2><p>Forklifts are among the most common causes of serious injury in warehouse environments.</p><h3>Licence Required</h3><p>You must hold a valid <strong>LF licence</strong> to operate any forklift on site. No exceptions.</p><h3>Pre-Operation Check (DAMP)</h3><ul><li><strong>D</strong> — Documentation (licence, pre-start checklist)</li><li><strong>A</strong> — Around the vehicle (visual inspection, tyres, leaks)</li><li><strong>M</strong> — Mast, forks, hydraulics, seatbelt</li><li><strong>P</strong> — Power source (fuel, battery, LPG)</li></ul><h3>Speed Limits</h3><ul><li>Warehouse: <strong>10 km/h max</strong></li><li>Pedestrian zones: <strong>5 km/h max</strong></li></ul>','5:50',2,0],
  [toolboxId,'Racking & Storage Systems','<h2>Racking & Storage Systems</h2><p>Racking failures can cause catastrophic injuries. Never exceed load limits. Check loading bay labels before storing.</p><h3>Daily Inspection</h3><p>Check for: bent uprights, missing beam locks, dislodged safety pins, unevenly distributed loads. If damage is found, tag with "Do Not Use" and report immediately.</p><h3>Correct Loading</h3><ul><li>Heavier items on lower shelves.</li><li>Distribute weight evenly across the bay.</li><li>Pallet overhang must not exceed 50mm.</li><li>Never block emergency exits or fire equipment.</li></ul>','3:55',3,0],
  [toolboxId,'Hazardous Materials Handling','<h2>Hazardous Materials Handling</h2><p>Some goods are classified as hazardous. Proper handling protects you, your colleagues, and the environment.</p><h3>Safety Data Sheets (SDS)</h3><p>Every hazardous substance must have an SDS at the point of use. The SDS covers: hazards, safe handling, required PPE, first aid measures, and spill response.</p><h3>Storage Rules</h3><ul><li>Store in the designated chemical store only.</li><li>Flammables in flammable cabinets, away from ignition sources.</li><li>Never store incompatible chemicals together.</li><li>Keep containers sealed when not in use.</li></ul>','4:40',4,0],
  [toolboxId,'Loading Dock Operations','<h2>Loading Dock Operations</h2><p>The loading dock is one of the highest-risk areas in any warehouse.</p><h3>Docking Procedure</h3><ol><li>Direct driver to reverse slowly — use a spotter.</li><li>Apply <strong>wheel chocks</strong> before the driver exits.</li><li>Engage dock lock if fitted.</li><li>Deploy dock leveller.</li></ol><h3>During Operations</h3><ul><li>No unauthorised personnel in dock area.</li><li>Check trailer floor integrity before driving forklift inside.</li><li>Never drive a forklift onto an unsecured trailer.</li></ul>','4:15',5,0],
  [toolboxId,'First Aid & Incident Reporting','<h2>First Aid & Incident Reporting</h2><h3>First Aid Kit Locations</h3><ul><li>Receiving Bay — Column A12</li><li>Main Warehouse — Column C8</li><li>Loading Dock — Dock Door 3</li><li>Break Room — Main wall</li></ul><h3>Reporting an Incident</h3><ol><li>Ensure injured person receives care first.</li><li>Secure the scene.</li><li>Notify your supervisor immediately.</li><li>Complete an <strong>Incident Report Form</strong> within 24 hours.</li><li>All near-misses must also be reported.</li></ol>','3:50',6,0],
  [toolboxId,'Toolbox Training Assessment','<h2>Toolbox Training Assessment</h2><p>Score at least <strong>70%</strong> to pass. You may retake if needed.</p>','6:00',7,1]
];
const lessonIds = {};
iLessons.forEach(([cid,title,content,dur,oi,hq]) => { lessonIds[`${cid}-${oi}`] = il.run(cid,title,content,dur,oi,hq).lastInsertRowid; });

// ── Quiz Questions ────────────────────────────────────────────────────────────
const iq = db.prepare(`INSERT INTO quiz_questions (lesson_id, question, order_index) VALUES (?, ?, ?)`);
const io = db.prepare(`INSERT INTO quiz_options (question_id, option_text, is_correct) VALUES (?, ?, ?)`);
const addQ = (lid, questions) => questions.forEach((q,i) => {
  const qid = iq.run(lid, q.q, i+1).lastInsertRowid;
  q.opts.forEach(o => io.run(qid, o.t, o.c ? 1 : 0));
});

addQ(lessonIds[`${inductionId}-6`], [
  { q:'What should you do immediately when you discover a fire?', opts:[{t:'Activate the fire alarm and evacuate immediately',c:true},{t:'Try to extinguish it yourself first',c:false},{t:'Wait to see if it grows before raising the alarm',c:false},{t:'Collect your belongings then exit',c:false}]},
  { q:'Maximum recommended weight for a single manual lift (men) without assistance?', opts:[{t:'25 kg',c:true},{t:'10 kg',c:false},{t:'40 kg',c:false},{t:'50 kg',c:false}]},
  { q:'You notice a safety hazard that is not an immediate emergency. What do you do?', opts:[{t:'Report to supervisor and complete a hazard report form',c:true},{t:'Ignore it if it doesn\'t affect your task',c:false},{t:'Fix it yourself without telling anyone',c:false},{t:'Wait until end of shift',c:false}]},
  { q:'Which behaviour violates our workplace conduct policy?', opts:[{t:'Making personal calls on the warehouse floor during work hours',c:true},{t:'Reporting a near-miss to your supervisor',c:false},{t:'Wearing your access card visibly',c:false},{t:'Using correct manual handling technique',c:false}]},
  { q:'During a fire emergency, which evacuation route should you use?', opts:[{t:'Nearest clearly marked emergency exit, using stairs',c:true},{t:'The lift — it\'s the fastest route',c:false},{t:'Main entrance only, regardless of distance',c:false},{t:'Any unlocked door you can find',c:false}]}
]);
addQ(lessonIds[`${toolboxId}-7`], [
  { q:'What does DAMP stand for in a forklift pre-operation check?', opts:[{t:'Documentation, Around, Mast, Power',c:true},{t:'Drive, Adjust, Monitor, Park',c:false},{t:'Detect, Assess, Manage, Proceed',c:false},{t:'Daily, Around, Maintain, Power',c:false}]},
  { q:'What must be done BEFORE opening a loading dock door?', opts:[{t:'Apply wheel chocks and confirm vehicle is secured',c:true},{t:'Call the transport company',c:false},{t:'Ensure forklift battery is charged',c:false},{t:'Nothing — just open the door',c:false}]},
  { q:'What PPE is mandatory in ALL operational zones?', opts:[{t:'Hi-vis vest and safety boots',c:true},{t:'Hard hat and gloves only',c:false},{t:'Safety glasses and face shield',c:false},{t:'Ear protection and knee pads',c:false}]},
  { q:'Where do you find procedures for responding to a chemical spill?', opts:[{t:'The Safety Data Sheet (SDS) for that chemical',c:true},{t:'The warehouse operations manual',c:false},{t:'Ask a colleague',c:false},{t:'Search online',c:false}]},
  { q:'Maximum speed for a forklift in a pedestrian zone?', opts:[{t:'5 km/h',c:true},{t:'10 km/h',c:false},{t:'15 km/h',c:false},{t:'20 km/h',c:false}]},
  { q:'What should you do if you identify a near-miss incident?', opts:[{t:'Report to supervisor and complete an incident report form',c:true},{t:'Ignore it — nobody was hurt',c:false},{t:'Only report if it happens again',c:false},{t:'Tell a colleague but not a supervisor',c:false}]}
]);

// ── Compliance Categories ─────────────────────────────────────────────────────
const icat = db.prepare(`INSERT INTO compliance_categories (name, description, icon, color, order_index) VALUES (?, ?, ?, ?, ?)`);
const catCleaning   = icat.run('Cleaning & Hygiene',    'Daily and weekly cleaning schedules, hygiene standards, and sanitation monitoring.',     '🧹', '#06B6D4', 1).lastInsertRowid;
const catPest       = icat.run('Pest Control',           'Pest control audit requirements, bait station inspections, and contractor management.',   '🐀', '#84CC16', 2).lastInsertRowid;
const catSafety     = icat.run('Safety Procedures',      'Operational safety checks including forklift, racking, cold room, and pick packer.',     '⛑️', '#EF4444', 3).lastInsertRowid;
const catFirstAid   = icat.run('First Aid',              'First aid kit requirements, first aider registers, and incident reporting.',              '🏥', '#EC4899', 4).lastInsertRowid;
const catEmergency  = icat.run('Emergency Procedures',   'Emergency equipment checks, evacuation drill tracking, and procedure compliance.',        '🚨', '#F97316', 5).lastInsertRowid;
const catPPE        = icat.run('PPE Requirements',       'PPE issuance, condition checks, and compliance monitoring across all staff.',             '🦺', '#A855F7', 6).lastInsertRowid;
const catTraffic    = icat.run('Traffic Management',     'Warehouse traffic flow, separation compliance, and vehicle/pedestrian safety.',           '🚛', '#3B82F6', 7).lastInsertRowid;
const catWHS        = icat.run('WHS Responsibilities',   'Workplace Health & Safety obligation tracking, register maintenance, and reporting.',     '📋', '#10B981', 8).lastInsertRowid;

// ── Checklists ────────────────────────────────────────────────────────────────
const icl = db.prepare(`INSERT INTO checklists (title, category_id, frequency, assigned_role_id, description) VALUES (?, ?, ?, ?, ?)`);
const icli = db.prepare(`INSERT INTO checklist_items (checklist_id, title, description, order_index, is_critical) VALUES (?, ?, ?, ?, ?)`);

const addCL = (title, catId, freq, roleId, desc, items) => {
  const clId = icl.run(title, catId, freq, roleId, desc).lastInsertRowid;
  items.forEach((item, i) => icli.run(clId, item.t, item.d||null, i+1, item.c||0));
  return clId;
};

// Daily Cleaning
addCL('Daily Cleaning Checklist', catCleaning, 'daily', workerRoleId, 'Complete every shift before starting operations.',
[{t:'Sweep all aisles and walkways',c:1},{t:'Mop wet areas (dock, cold room entrance)',c:1},{t:'Empty all rubbish bins and replace liners'},{t:'Clean amenities — toilets, basins, and changerooms',c:1},{t:'Wipe down all workstations and surfaces'},{t:'Clean loading dock area and remove debris'},{t:'Ensure all spill kits are fully stocked',c:1},{t:'Inspect floor for slip/trip hazards and rectify',c:1},{t:'Clean break room and kitchen area'},{t:'Inspect and clear all floor drains'},{t:'Remove empty pallets and cardboard from aisles',c:1},{t:'Ensure correct waste separation (cardboard, general, recyclable)'}]);

// Weekly Deep Clean
addCL('Weekly Deep Clean Checklist', catCleaning, 'weekly', supervisorRoleId, 'Completed every Friday before end of shift.',
[{t:'Deep clean all amenities including grout and fixtures',c:1},{t:'Clean cold room internal surfaces and shelving',c:1},{t:'Wash and sanitise all food contact surfaces',c:1},{t:'Clean racking uprights and beams at ground level'},{t:'High-pressure clean dock area'},{t:'Clean all ventilation grilles and exhaust fans'},{t:'Clean all light fixtures and covers'},{t:'Scrub all floor surfaces with machine scrubber'},{t:'Clean all dock seals and shelter curtains'},{t:'Inspect and clean rodent bait stations',c:1},{t:'Clean all safety and compliance signage'},{t:'Sanitise all high-touch points (door handles, railings)',c:1},{t:'Inspect and clean waste storage area'},{t:'Clean fire safety equipment exteriors'},{t:'Supervisor sign-off on weekly deep clean record',c:1}]);

// Pest Control Monthly
addCL('Pest Control Monthly Inspection', catPest, 'monthly', supervisorRoleId, 'Conducted monthly by trained staff prior to contractor visit.',
[{t:'Inspect all bait stations — check bait levels and condition',c:1},{t:'Check for rodent activity evidence (droppings, gnaw marks)',c:1},{t:'Inspect dock seals for gaps or damage',c:1},{t:'Check all floor drains for pest entry points'},{t:'Inspect product storage areas for insect activity'},{t:'Review and countersign pest control contractor report',c:1},{t:'Review pest sighting log for recent reports'},{t:'Inspect external perimeter for harborage areas'},{t:'Confirm bait station site map is current'},{t:'Check insect light traps and replace catch boards',c:1}]);

// Daily Supervisor Safety Check
addCL('Daily Supervisor Safety Check', catSafety, 'daily', supervisorRoleId, 'Must be completed by the supervisor at the start of every shift.',
[{t:'Confirm all staff are wearing correct PPE',c:1},{t:'Verify forklift pre-operation checklists have been completed',c:1},{t:'Inspect loading dock — safety barriers in place',c:1},{t:'All emergency exits are clear, unblocked, and signed',c:1},{t:'First aid kits are stocked and accessible',c:1},{t:'Review any incidents or near-misses from prior shift'},{t:'Cold room temperature logs are current and within range',c:1},{t:'Inspect racking for visible damage — any found must be tagged',c:1},{t:'Pedestrian walkways are clear and clearly marked',c:1},{t:'Speed limits being observed in all zones'},{t:'Fire extinguishers are in position and accessible',c:1},{t:'Sign daily safety check register',c:1}]);

// Forklift Pre-Operation
addCL('Forklift Pre-Operation Checklist', catSafety, 'daily', workerRoleId, 'Complete before every forklift operation. Do not operate if any item is faulty.',
[{t:'Check tyres for damage, cuts, or excessive wear',c:1},{t:'Inspect for fluid leaks (hydraulic oil, fuel, battery)',c:1},{t:'Inspect forks for cracks, bends, or damage',c:1},{t:'Check mast chains for wear and adequate lubrication',c:1},{t:'Verify overhead guard is secure and undamaged',c:1},{t:'Test horn — must be clearly audible',c:1},{t:'Test brakes — must operate correctly and promptly',c:1},{t:'Check seatbelt is functional and not frayed',c:1},{t:'Test lights and warning beacon'},{t:'Check LPG cylinder for leaks and secure fitting (if LPG)',c:1},{t:'Verify rated capacity plate is visible and legible',c:1},{t:'Sign and date the pre-operation checklist',c:1}]);

// Cold Room Check
addCL('Cold Room Safety & Compliance Check', catSafety, 'weekly', supervisorRoleId, 'Weekly check of cold room safety systems and staff compliance.',
[{t:'Cold room door alarm is functional — test activation',c:1},{t:'Internal emergency release handle is accessible and working',c:1},{t:'Temperature log is current and within acceptable range',c:1},{t:'All staff briefed on cold room entry procedures'},{t:'Cold-weather PPE is available (thermal vest, gloves, hat)',c:1},{t:'Internal lighting is fully functional',c:1},{t:'No products blocking emergency door or exit path',c:1},{t:'Cold room floor is free of ice or slip hazards',c:1}]);

// PPE Weekly Check
addCL('PPE Compliance Check', catPPE, 'weekly', supervisorRoleId, 'Weekly audit of PPE availability, condition, and compliance.',
[{t:'All floor staff are wearing hi-vis vests',c:1},{t:'All staff wearing safety boots in operational areas',c:1},{t:'Hard hats available and in good condition in dock/racking areas',c:1},{t:'Safety glasses available and worn where required',c:1},{t:'Cut-resistant gloves available for manual handling tasks'},{t:'Chemical-resistant gloves available in chemical store',c:1},{t:'All PPE is in good condition — no damage or excessive wear',c:1},{t:'PPE storage areas are organised and clearly labelled'}]);

// Emergency Equipment
addCL('Emergency Equipment Weekly Check', catEmergency, 'weekly', supervisorRoleId, 'Verify all emergency systems and equipment are operational.',
[{t:'All fire extinguishers are in correct marked locations',c:1},{t:'Fire extinguisher pressure gauges are in the green zone',c:1},{t:'Fire hose reels are accessible and in good condition',c:1},{t:'All emergency exit doors open freely and are unobstructed',c:1},{t:'Emergency lighting is functional — test activation',c:1},{t:'First aid kits are fully stocked — review contents list',c:1},{t:'Eyewash stations are functional, clean, and accessible',c:1},{t:'Emergency contacts board is current and clearly visible',c:1},{t:'Spill kits are fully stocked and accessible'},{t:'AED defibrillator is charged and accessible (if on site)',c:1}]);

// Traffic Management
addCL('Daily Traffic Management Compliance', catTraffic, 'daily', supervisorRoleId, 'Ensure vehicle and pedestrian separation is maintained.',
[{t:'All pedestrian walkways are clearly marked and unobstructed',c:1},{t:'Forklift/pedestrian separation barriers are in place',c:1},{t:'Speed limit signs are clearly visible and undamaged'},{t:'Forklifts observed operating within speed limits',c:1},{t:'Traffic flow mirrors are clean and correctly positioned'},{t:'Loading dock area clear of unauthorised pedestrians',c:1},{t:'Visitor sign-in register is current'},{t:'No vehicles parked in fire lanes or pedestrian areas',c:1}]);

// New Employee Induction
addCL('New Employee Induction Checklist', catWHS, 'one-time', supervisorRoleId, 'Complete for every new employee on their first day.',
[{t:'HR paperwork and employment documents completed',c:1},{t:'Full site tour completed — all zones shown',c:1},{t:'Emergency evacuation procedure explained, muster point identified',c:1},{t:'PPE issued and correct usage demonstrated',c:1},{t:'Manual handling training completed',c:1},{t:'Forklift exclusion zones explained',c:1},{t:'Cold room entry procedures explained (if applicable)',c:1},{t:'Chemical safety and SDS location explained',c:1},{t:'First aid kit locations identified',c:1},{t:'Reporting structure and chain of command explained'},{t:'Code of conduct and HR policies reviewed and signed',c:1},{t:'Drug & alcohol policy acknowledged in writing',c:1},{t:'IT and system access set up and tested'},{t:'Buddy/mentor assigned for first week',c:1},{t:'Signed induction acknowledgement form completed and filed',c:1}]);

// ── SOPs ──────────────────────────────────────────────────────────────────────
const isop = db.prepare(`INSERT INTO sops (title, category, summary, content, version, applies_to, created_by, reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

isop.run('Pick Packer Safety Procedures', 'Safety', 'Standard safety procedures for all pick packer staff operating in the warehouse.',
`<h2>Pick Packer Safety Procedures</h2>
<p>This SOP applies to all staff performing pick and pack operations in the warehouse. All pick packers must read and understand these procedures before commencing work.</p>

<h3>1. Personal Protective Equipment</h3>
<ul><li>Hi-vis vest must be worn at all times on the warehouse floor.</li><li>Safety boots (steel-capped) are mandatory in all operational areas.</li><li>Cut-resistant gloves must be worn when handling sharp-edged products.</li><li>Safety glasses required when working with particulate or chemical goods.</li></ul>

<h3>2. Manual Handling</h3>
<ul><li>Maximum single lift: 25kg (men), 16kg (women). Use mechanical aids for heavier loads.</li><li>Use correct lifting technique: bend knees, keep back straight, hold load close to body.</li><li>For awkward or bulky items, request assistance from a colleague.</li><li>Use trolleys, pallet jacks, or hand trucks wherever possible.</li></ul>

<h3>3. Pedestrian Safety in Forklift Zones</h3>
<ul><li>Always use marked pedestrian walkways (yellow lined).</li><li>Make eye contact with forklift operators before crossing their path.</li><li>Never walk behind a reversing forklift.</li><li>Do not enter cross-traffic zones without checking both directions.</li></ul>

<h3>4. Racking Safety</h3>
<ul><li>Only access products from ground-level unless trained for elevated picking.</li><li>Do not climb racking structures — use approved ladders or elevated work platforms.</li><li>Report any damaged racking immediately to your supervisor.</li><li>Do not exceed the shelf load limits posted on each bay.</li></ul>

<h3>5. Hazardous Goods</h3>
<ul><li>Check the product label and SDS before picking any chemical or hazardous item.</li><li>Wear required PPE as specified on the SDS.</li><li>Do not pick damaged or leaking chemical containers — isolate and report.</li></ul>

<h3>6. Incident Reporting</h3>
<p>All injuries, near-misses, and hazards must be reported to your supervisor immediately and recorded in the incident register. Do not attempt to handle incidents without reporting them first.</p>`,
'1.2', 'Worker,Supervisor', u3, '2026-01-15');

isop.run('Forklift Driver Safety Procedures', 'Safety', 'Mandatory safety procedures for all licensed forklift operators on site.',
`<h2>Forklift Driver Safety Procedures</h2>
<p>This SOP applies exclusively to staff holding a valid LF (Forklift) licence. All operators must comply with these procedures at all times.</p>

<h3>1. Licensing Requirements</h3>
<ul><li>A current, valid LF High Risk Work Licence is required to operate any forklift on site.</li><li>Licences must be carried on your person at all times when operating.</li><li>Expired licences must be renewed before operating — no grace period is permitted.</li></ul>

<h3>2. Pre-Operation DAMP Check</h3>
<p>Complete the DAMP check before every shift:</p>
<ul><li><strong>D — Documentation:</strong> Verify your licence is current, sign the pre-start checklist.</li><li><strong>A — Around:</strong> Walk around the forklift. Check tyres, body, forks, and look for leaks.</li><li><strong>M — Mast:</strong> Check forks, mast chains, hydraulic hoses, overhead guard, and seatbelt.</li><li><strong>P — Power:</strong> Check fuel/LPG/battery. Confirm levels are adequate for the shift.</li></ul>
<p>Any defect found during the pre-start check must be reported. <strong>Do not operate a faulty forklift.</strong></p>

<h3>3. Safe Operating Rules</h3>
<ul><li>Maximum speed: 10 km/h in general warehouse areas, 5 km/h in pedestrian zones.</li><li>Always travel with forks lowered (150–200mm from the floor) when not lifting.</li><li>Sound the horn at all blind corners, intersections, and before entering/exiting dock doors.</li><li>Never carry unauthorised passengers — one operator only.</li><li>Never exceed the rated load capacity shown on the data plate.</li><li>Wear your seatbelt at all times when operating.</li><li>Do not use a mobile phone while operating.</li></ul>

<h3>4. Load Handling</h3>
<ul><li>Ensure loads are stable and secure before lifting.</li><li>Tilt the mast back when carrying loads.</li><li>Never lift people on the forks — use an approved work platform only.</li><li>Approach racking slowly and carefully — align before inserting forks.</li></ul>

<h3>5. Pedestrian Interaction</h3>
<ul><li>Pedestrians always have right of way.</li><li>Come to a complete stop if a pedestrian is nearby.</li><li>Sound the horn and wait for acknowledgement before proceeding.</li></ul>

<h3>6. Parking</h3>
<ul><li>Park only in designated forklift parking areas.</li><li>Lower forks to the floor, apply the handbrake, and turn off the ignition when parking.</li><li>Never leave a running forklift unattended.</li></ul>`,
'2.0', 'Worker,Supervisor', u3, '2026-02-01');

isop.run('Cold Room Safety Procedures', 'Safety', 'Entry, operation, and emergency procedures for cold room and cool store areas.',
`<h2>Cold Room Safety Procedures</h2>
<p>This SOP covers all staff who enter or work within cold room and cool store facilities. Cold environments present unique risks including hypothermia, slips on icy surfaces, and the risk of entrapment.</p>

<h3>1. Before Entering</h3>
<ul><li>Ensure appropriate cold-weather PPE is worn: thermal vest, insulated gloves, beanie.</li><li>Check that the internal emergency release handle is functional before each entry.</li><li>Never enter a cold room alone if the door does not have an internal release.</li><li>Do not prop cold room doors open — this compromises temperature and creates entrapment risk.</li></ul>

<h3>2. While Inside</h3>
<ul><li>Be aware of ice build-up on floors — walk carefully and report icy patches immediately.</li><li>Do not operate forklifts inside the cold room unless specifically trained for cold room forklift operations.</li><li>Limit time inside to what is necessary for the task.</li><li>If you feel unwell (shivering, disorientation), exit immediately and notify a supervisor.</li></ul>

<h3>3. Emergency — Entrapment</h3>
<ul><li>Every cold room must have an internal emergency release — a large, clearly marked green or yellow handle on the inside of the door.</li><li>If you are trapped, use the internal release to exit immediately.</li><li>Activate the cold room alarm if fitted.</li><li>All staff must know the location of the internal release on their first day.</li></ul>

<h3>4. Temperature Monitoring</h3>
<ul><li>Temperature logs must be checked and signed at least twice per shift.</li><li>Acceptable temperature range: 0°C to 4°C for refrigerated storage.</li><li>If temperature is out of range, notify the supervisor immediately — do not continue storing temperature-sensitive goods.</li></ul>

<h3>5. Maintenance</h3>
<ul><li>Report any damaged door seals, malfunctioning alarms, or lighting failures immediately.</li><li>No maintenance work is to be performed inside the cold room without a formal permit-to-work.</li></ul>`,
'1.1', 'Worker,Supervisor,Manager', u5, '2026-01-20');

isop.run('3-Level Racking Safety Procedures', 'Safety', 'Safe use, inspection, and maintenance of three-level selective pallet racking systems.',
`<h2>3-Level Racking Safety Procedures</h2>
<p>This SOP covers the safe use and inspection of the warehouse three-level selective pallet racking system. Racking failure can result in catastrophic injury and must be taken seriously.</p>

<h3>1. Load Limits</h3>
<ul><li>Each racking bay has a maximum load limit label posted on the upright. This limit must never be exceeded.</li><li>Do not exceed <strong>1,000kg per bay</strong> (or as specified on the bay label).</li><li>Distribute loads evenly across the bay — do not concentrate weight on one side.</li></ul>

<h3>2. Daily Visual Inspection</h3>
<p>Before using any racking, visually inspect for:</p>
<ul><li>Bent, buckled, or damaged uprights (vertical members)</li><li>Dislodged or damaged beam-end safety pins or locking clips</li><li>Damaged or missing horizontal beam members</li><li>Impact damage at the base of uprights (forklift strikes)</li><li>Overloaded or unstable pallets</li></ul>
<p>If any damage is found: <strong>do not use the affected bay.</strong> Tag it with a "Do Not Use" tag and report it to your supervisor immediately.</p>

<h3>3. Forklift Interaction with Racking</h3>
<ul><li>Approach racking slowly and align forks carefully before inserting.</li><li>Do not force pallets into bays — if resistance is felt, stop and investigate.</li><li>Avoid striking uprights with forks or pallets — even minor impacts weaken the structure.</li><li>Place pallets squarely on beams — no overhangs exceeding 50mm per side.</li></ul>

<h3>4. Upper Level Access</h3>
<ul><li>Only store product on upper levels using a licensed forklift operator.</li><li>Personnel must not climb racking to retrieve or place products.</li><li>If access is required to upper levels for inspection, use an approved EWP (elevated work platform).</li></ul>

<h3>5. Reporting Damage</h3>
<ul><li>Any racking damage, including minor upright bends, must be reported and assessed by a competent person before the bay is returned to use.</li><li>Significant damage requires a racking engineer assessment before recommissioning.</li></ul>`,
'1.3', 'Worker,Supervisor,Manager', u5, '2026-01-10');

isop.run('Traffic Management Plan', 'Traffic Management', 'Warehouse traffic flow policies for safe separation of vehicles and pedestrians.',
`<h2>Warehouse Traffic Management Plan</h2>
<p>The purpose of this plan is to ensure the safe separation of forklift traffic and pedestrians throughout the warehouse and loading dock areas.</p>

<h3>1. Designated Zones</h3>
<ul><li><strong>Yellow hatched zones:</strong> Pedestrian walkways — vehicles must give way.</li><li><strong>Blue zones:</strong> Forklift operating areas — pedestrians must not enter unless authorised.</li><li><strong>Red zones:</strong> Loading dock — authorised dock staff only during loading/unloading operations.</li></ul>

<h3>2. Speed Limits</h3>
<ul><li>All site vehicles: maximum <strong>10 km/h</strong> on internal roads and warehouse aisles.</li><li>Pedestrian zones and high-traffic areas: maximum <strong>5 km/h</strong>.</li><li>External truck movements: follow the site's one-way traffic circuit.</li></ul>

<h3>3. Pedestrian Rules</h3>
<ul><li>All pedestrians must use designated walkways at all times.</li><li>Make eye contact with vehicle operators before crossing any vehicle travel route.</li><li>Never walk behind a reversing vehicle or forklift.</li><li>All visitors must be escorted by an authorised employee at all times.</li></ul>

<h3>4. Vehicle Rules</h3>
<ul><li>Sound the horn at all blind spots, corners, and before entering/exiting dock doors.</li><li>Forklifts must yield to pedestrians in shared zones.</li><li>No vehicle is to be left running and unattended.</li><li>All external trucks must follow the one-way entry/exit circuit — no reversing on external roads.</li></ul>

<h3>5. Loading Dock</h3>
<ul><li>Dock doors must remain closed when not actively in use.</li><li>Only dock staff and the relevant driver are permitted in the dock area during operations.</li><li>Wheel chocks must be applied before any truck door is opened.</li></ul>`,
'1.0', 'Worker,Supervisor,Manager', u5, '2026-01-05');

isop.run('WHS Responsibilities Register', 'WHS', 'Workplace Health and Safety responsibilities for all roles and their accountability obligations.',
`<h2>WHS Responsibilities Register</h2>
<p>This document outlines the WHS responsibilities of each role in accordance with the Work Health & Safety Act 2011.</p>

<h3>All Workers</h3>
<ul><li>Take reasonable care of their own health and safety.</li><li>Take reasonable care not to adversely affect the health and safety of others.</li><li>Comply with all WHS instructions, procedures, and policies.</li><li>Report all hazards, near-misses, and incidents immediately.</li><li>Cooperate with any WHS inspection or investigation.</li><li>Participate in WHS training and induction programs.</li></ul>

<h3>Supervisors</h3>
<ul><li>All worker responsibilities, plus:</li><li>Conduct daily safety checks and sign the safety register.</li><li>Ensure all workers under their supervision are adequately trained and competent.</li><li>Enforce PPE and safety procedure compliance.</li><li>Investigate and document all reported hazards and incidents within 24 hours.</li><li>Conduct regular toolbox talks with their team (minimum monthly).</li><li>Ensure compliance documentation is current and accessible.</li></ul>

<h3>Managers</h3>
<ul><li>All supervisor responsibilities, plus:</li><li>Ensure adequate WHS resources are available (PPE, first aid, emergency equipment).</li><li>Review and sign off on incident investigation reports.</li><li>Ensure all mandatory training and certifications are current.</li><li>Conduct or arrange annual WHS audits.</li><li>Maintain the WHS Management System and keep all procedures current.</li><li>Report notifiable incidents to the relevant authority (SafeWork or equivalent) within required timeframes.</li></ul>

<h3>WHS Officer / Safety Representative</h3>
<ul><li>Maintain all compliance registers and documentation.</li><li>Coordinate pest control, emergency drills, and external audits.</li><li>Review and update SOPs and checklists annually or after any incident.</li><li>Facilitate WHS committee meetings.</li><li>Conduct workplace inspections and hazard assessments quarterly.</li></ul>`,
'2.1', 'Supervisor,Manager', u5, '2026-03-01');

// ── Tasks ─────────────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];
const addDays = (d) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString().split('T')[0]; };
const it = db.prepare(`INSERT INTO tasks (title, description, category, assigned_to, assigned_role_id, due_date, priority, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const adminId = db.prepare('SELECT id FROM users WHERE role = ?').get('admin').id;

it.run('Complete WHS Induction - John Smith','Ensure new employee John Smith completes the full induction checklist and online induction training module.','induction',u1,null,addDays(1),'high','pending',adminId);
it.run('Complete WHS Induction - Sarah Johnson','Ensure new employee Sarah Johnson completes the full induction checklist and online induction training module.','induction',u2,null,addDays(2),'high','pending',adminId);
it.run('Monthly Pest Control Audit','Coordinate with pest control contractor and complete the monthly pest control inspection checklist.','audit',u3,null,addDays(7),'medium','pending',adminId);
it.run('Quarterly Safety Audit','Conduct quarterly internal WHS audit across all warehouse zones. Document findings and create action plan.','audit',null,managerRoleId,addDays(14),'high','pending',adminId);
it.run('Update Training Records','Review and update all staff training records in the system. Identify any expired certifications.','compliance',u5,null,addDays(5),'medium','pending',adminId);
it.run('Toolbox Talk — Cold Room Safety','Conduct a 15-minute toolbox talk with all workers on cold room entry procedures and emergency release operation.','safety',u3,null,addDays(3),'medium','pending',adminId);
it.run('Review Emergency Evacuation Procedure','Review the current emergency evacuation procedure and ensure muster point signage is current.','compliance',null,managerRoleId,addDays(10),'medium','pending',adminId);
it.run('Forklift Operator Licence Check','Verify that all forklift operators hold current, valid LF licences. Document expiry dates.','compliance',u3,null,addDays(4),'high','pending',adminId);
it.run('Implement New Racking SOP','Distribute updated 3-Level Racking SOP to all staff and obtain signed acknowledgements.','sop',null,supervisorRoleId,addDays(7),'medium','pending',adminId);
it.run('Safety Onboarding — Emma Wilson','New forklift operator — ensure Emma Wilson completes safety onboarding including forklift pre-operation training.','safety',u4,null,today,'critical','in_progress',adminId);

// ── Sample Incidents ──────────────────────────────────────────────────────────
const ii = db.prepare(`INSERT INTO incidents (type, title, description, location, severity, reported_by, injured_party, first_aid_given, first_aider, action_taken, follow_up_required, status, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
ii.run('near_miss','Forklift Entered Pedestrian Zone','Forklift operator briefly entered the pedestrian walkway near Column C8 during picking operations. No injury occurred.','Zone C — Column C8 area','medium',u3,null,0,null,'Operator reminded of pedestrian zone boundaries. Additional floor marking applied at Column C8.',1,'under_review',addDays(-3));
ii.run('first_aid','Minor Laceration — Hand Injury','Worker sustained a minor cut to the right hand while opening a corrugated carton with a box cutter. Cut approximately 2cm, non-serious.','Zone E — Pick & Pack Area','low',u1,'John Smith',1,'Sarah Johnson (First Aider)','First aid applied — wound cleaned, dressed, and bandaged. Operator returned to light duties. Incident form completed.',0,'closed',addDays(-1));
ii.run('emergency_drill','Quarterly Emergency Evacuation Drill','Scheduled quarterly fire evacuation drill. All 12 staff present evacuated safely to muster point within 4 minutes 30 seconds. No issues identified.','Whole site','low',u3,null,0,null,'Drill completed successfully. Time recorded: 4 min 30 sec. All staff accounted for. No corrective actions required.',0,'closed',addDays(-7));

// ── Notifications ─────────────────────────────────────────────────────────────
const in_ = db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`);
[[u1,'Induction Training, Toolbox Training'],[u2,'Induction Training, Toolbox Training'],[u3,'Induction Training, Toolbox Training'],[u4,'Induction Training, Toolbox Training'],[u5,'Induction Training, Toolbox Training'],[u6,'Induction Training']].forEach(([uid, courses]) => {
  in_.run(uid,'Welcome to the Training Portal! 🎉',`Your account is ready. Assigned: ${courses}. Start your training from the dashboard.`,'info');
});
in_.run(u1,'New Task Assigned','You have a new task: "Complete WHS Induction". Due tomorrow. Please log in to review.','info');
in_.run(u3,'Task Assigned — Pest Control Audit','Monthly pest control audit is due in 7 days. Please coordinate with the contractor and complete the checklist.','warning');
in_.run(u4,'Safety Onboarding Required','Your forklift safety onboarding is marked as critical priority. Please complete this today.','warning');

console.log('\n✅ Database seeded successfully!\n');
console.log('Admin:   admin@warehouse.com  /  admin123');
console.log('Worker:  john.smith@warehouse.com  /  user123');
console.log('Super:   mike.t@warehouse.com  /  user123');
console.log('Manager: david.c@warehouse.com  /  user123\n');
