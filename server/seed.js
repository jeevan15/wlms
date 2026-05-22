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
const ir = db.prepare(`INSERT INTO job_roles (name, color, description, department) VALUES (?, ?, ?, ?)`);
// Office
const hrId           = ir.run('HR',                    '#6366F1', 'Human Resources — people operations and compliance.',         'Office').lastInsertRowid;
const accountantId   = ir.run('Accountant',             '#F59E0B', 'Accounting and finance team member.',                       'Office').lastInsertRowid;
const itId           = ir.run('IT',                    '#06B6D4', 'Information Technology team member.',                        'Office').lastInsertRowid;
// Warehouse
const whAdminId      = ir.run('Warehouse Admin',        '#0EA5E9', 'Warehouse administrator — senior floor operations.',         'Warehouse').lastInsertRowid;
const forkliftId     = ir.run('Forklift',               '#3B82F6', 'Licensed forklift operator — LF licence required.',         'Warehouse').lastInsertRowid;
const pickPackerId   = ir.run('Pick & Packer',          '#10B981', 'Order picking and packing operations.',                     'Warehouse').lastInsertRowid;
const purePackerId   = ir.run('Pure Packer',            '#06B6D4', 'Dedicated packing station operator.',                       'Warehouse').lastInsertRowid;
// Manufacturing
const teamLeaderId   = ir.run('Team Leader',            '#8B5CF6', 'Manufacturing team leader, front-line supervision.',         'Manufacturing').lastInsertRowid;
const supervisorId   = ir.run('Supervisor',             '#10B981', 'Operations supervisor, shift management.',                  'Manufacturing').lastInsertRowid;
const prodMgrId      = ir.run('Production Manager',     '#F59E0B', 'Production department manager.',                            'Manufacturing').lastInsertRowid;
const headOpsId      = ir.run('Head of Operations',     '#EF4444', 'Head of all site operations.',                              'Manufacturing').lastInsertRowid;
const prodWorkerId   = ir.run('Production Worker',      '#64748B', 'General production floor worker.',                          'Manufacturing').lastInsertRowid;

// ── Users ─────────────────────────────────────────────────────────────────────
const ah = bcrypt.hashSync('admin123', 10), uh = bcrypt.hashSync('user123', 10);
const iu = db.prepare(`INSERT INTO users (name, title, given_name, last_name, employee_code, employee_type, email, password, role, department, job_role_id, onboarding_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
iu.run('Admin User',     null,   'Admin',  'User',    'EMP000', 'existing', 'admin@warehouse.com',      ah, 'admin', 'Office',        null,          1);
const u1 = iu.run('John Smith',    'Mr',    'John',   'Smith',   'EMP001', 'existing', 'john.smith@warehouse.com', uh, 'user',  'Warehouse',     forkliftId,   1).lastInsertRowid;
const u2 = iu.run('Sarah Johnson', 'Ms',    'Sarah',  'Johnson', 'EMP002', 'existing', 'sarah.j@warehouse.com',    uh, 'user',  'Warehouse',     pickPackerId, 1).lastInsertRowid;
const u3 = iu.run('Mike Torres',   'Mr',    'Mike',   'Torres',  'EMP003', 'existing', 'mike.t@warehouse.com',     uh, 'user',  'Manufacturing', supervisorId, 1).lastInsertRowid;
const u4 = iu.run('Emma Wilson',   'Ms',    'Emma',   'Wilson',  'EMP004', 'existing', 'emma.w@warehouse.com',     uh, 'user',  'Warehouse',     forkliftId,   1).lastInsertRowid;
const u5 = iu.run('David Chen',    'Mr',    'David',  'Chen',    'EMP005', 'existing', 'david.c@warehouse.com',    uh, 'user',  'Manufacturing', headOpsId,    1).lastInsertRowid;
const u6 = iu.run('Lisa Park',     'Ms',    'Lisa',   'Park',    'EMP006', 'existing', 'lisa.p@warehouse.com',     uh, 'user',  'Office',        hrId,         1).lastInsertRowid;

// ── Courses ───────────────────────────────────────────────────────────────────
const ic = db.prepare(`INSERT INTO courses (title, description, category, color, icon) VALUES (?, ?, ?, ?, ?)`);
const inductionId = ic.run('Induction Training','Your essential guide to getting started at our warehouse. Covers company policies, safety fundamentals, emergency procedures, and workplace conduct.','Induction','#7C3AED','building').lastInsertRowid;
const toolboxId   = ic.run('Toolbox Training','Hands-on safety training for warehouse operations. Covers PPE, forklift safety, hazardous materials, loading dock procedures, and first aid.','Safety','#DC2626','tool').lastInsertRowid;

const irc = db.prepare(`INSERT INTO role_courses (role_id, course_id) VALUES (?, ?)`);
// Warehouse + Manufacturing → Induction + Toolbox
[whAdminId, forkliftId, pickPackerId, purePackerId, teamLeaderId, supervisorId, prodMgrId, headOpsId, prodWorkerId].forEach(r => {
  irc.run(r, inductionId); irc.run(r, toolboxId);
});
// Office → Induction only
[hrId, accountantId, itId].forEach(r => irc.run(r, inductionId));

// ── Lessons ───────────────────────────────────────────────────────────────────
const il = db.prepare(`INSERT INTO lessons (course_id, title, content, duration, order_index, has_quiz) VALUES (?, ?, ?, ?, ?, ?)`);
const iLessons = [
  [inductionId,'Welcome & Warehouse Overview','<h2>Welcome to the Team!</h2><p>Welcome to our Grade 3 Storage &amp; Distribution warehouse. This module covers our facility overview, company values, and what is expected of every team member from day one.</p><h3>Our Facility</h3><p>This is a Grade 3 warehouse operating with cold room storage, forklift operations, 3-level pallet racking, pick packing, dispatch and receiving, staff amenities, and computer/administration stations.</p><h3>The Purpose of This Induction</h3><ul><li>Maintain workplace safety and meet compliance standards</li><li>Support audit readiness and ensure product/food safety</li><li>Reduce workplace incidents and train all staff consistently</li><li>Maintain clean and organised warehouse operations</li></ul><h3>Facility Areas</h3><ul><li>Ambient storage area &amp; cold room storage area</li><li>Receiving dock &amp; dispatch dock</li><li>Packing stations &amp; forklift traffic zones</li><li>Pedestrian walkways &amp; 3-level racking systems</li><li>Quarantine/damaged stock area &amp; waste disposal area</li><li>Lunchroom, amenities &amp; office/computer station</li></ul><h3>Core Values</h3><ul><li><strong>Safety First</strong> — Everyone goes home safe every shift.</li><li><strong>Integrity</strong> — We do what we say.</li><li><strong>Teamwork</strong> — We succeed together.</li></ul>','3:45',1,0],
  [inductionId,'Health, Safety & Manual Handling','<h2>Health, Safety &amp; Manual Handling</h2><p>Health and safety is not just a legal requirement — it is our moral obligation. Every employee is responsible for their own safety and the safety of those around them.</p><h3>Your Responsibilities (Section 21)</h3><ul><li>Follow all safety procedures at all times</li><li>Wear PPE correctly in all designated areas</li><li>Report hazards and near-misses immediately</li><li>Maintain housekeeping standards in your area</li><li>Operate equipment safely and only with proper authorisation</li><li>Attend all required training sessions</li><li>Report incidents and near misses to your supervisor</li></ul><h3>Manual Handling Rules</h3><ul><li>Bend knees when lifting — keep back straight</li><li>Keep loads close to your body</li><li>Avoid twisting while lifting</li><li>Use trolleys or pallet jacks for heavy items</li><li>Seek assistance for oversized or awkward loads</li></ul><h3>Prohibited Unsafe Behaviours</h3><ul><li>Climbing racking structures</li><li>Running anywhere in the warehouse</li><li>Blocking emergency exits or fire equipment</li><li>Unsafe stacking of product</li><li>Using damaged pallets</li><li>Operating any equipment without authorisation</li></ul>','5:20',2,0],
  [inductionId,'Emergency Procedures','<h2>Emergency Procedures</h2><p>Knowing what to do in an emergency can save lives. All staff must be familiar with these procedures before starting work on site.</p><h3>Emergency Situations — Know Them All</h3><ul><li>🔥 Fire</li><li>☣️ Chemical spill</li><li>🚑 Injury / medical emergency</li><li>❄️ Refrigeration failure</li><li>⚡ Power outage</li><li>💨 Gas leak</li><li>🚜 Forklift accident</li></ul><h3>Emergency Response Steps</h3><ol><li>Raise the alarm immediately</li><li>Notify your supervisor</li><li>Evacuate the area if required</li><li>Proceed to the designated assembly point</li><li>Contact emergency services if required (000)</li><li>Complete an incident report form after the event</li></ol><h3>Emergency Equipment Locations</h3><ul><li>Fire extinguishers &amp; fire blankets throughout the site</li><li>Spill kits at key locations on the warehouse floor</li><li>Emergency lighting &amp; exit signage at all exits</li><li>First aid kits: warehouse office, dispatch area, lunchroom, cold room entrance</li></ul><h3>Fire Emergency</h3><ol><li>Activate the nearest fire alarm pull station</li><li>Evacuate immediately — leave personal belongings</li><li>Use the nearest clearly marked emergency exit</li><li><strong>Never use lifts</strong> during fire emergencies</li><li>Proceed to your designated Muster Point</li><li>Wait for roll call from the Fire Warden</li></ol>','4:10',3,0],
  [inductionId,'Workplace Conduct & HR Policies','<h2>Workplace Conduct &amp; HR Policies</h2><p>We are committed to a safe, respectful, and productive workplace for everyone on site.</p><h3>Code of Conduct</h3><ul><li>Treat all colleagues, visitors, and customers with respect</li><li>Arrive on time and ready to work</li><li>Follow all company policies and procedures</li><li>Maintain confidentiality of company and customer information</li></ul><h3>Anti-Discrimination Policy</h3><p>Zero-tolerance for discrimination, bullying, and harassment. Any breach results in disciplinary action, up to and including termination.</p><h3>Drug &amp; Alcohol Policy</h3><p>Working under the influence is strictly prohibited and grounds for immediate dismissal. Random testing may be conducted at any time.</p><h3>Attendance Policy</h3><ul><li>Notify your supervisor as early as possible if you are unable to attend</li><li>Unexplained absences may result in disciplinary action</li></ul><h3>Housekeeping Responsibilities</h3><ul><li>Maintain your workstation in a clean and tidy condition at all times</li><li>Remove plastic wrap waste and dispose of correctly</li><li>Ensure correct waste separation (cardboard, general, recyclable)</li><li>Report pest sightings immediately — keep doors closed</li></ul>','4:55',4,0],
  [inductionId,'Traffic Management & Site Safety','<h2>Traffic Management &amp; Site Safety</h2><p>Strict traffic management rules are in place to protect pedestrians and forklift operators. Know the zones and follow the rules — every time.</p><h3>Site Speed Limits</h3><ul><li>General Warehouse: <strong>8 km/h maximum</strong></li><li>Cold Room: <strong>5 km/h maximum</strong></li><li>Dock Area: <strong>5 km/h maximum</strong></li></ul><h3>Pedestrian Rules</h3><ul><li>Always use designated pedestrian walkways (yellow lined)</li><li>Make eye contact with forklift operators before crossing</li><li>Never walk behind a reversing forklift</li><li>All visitors must be escorted by an authorised employee at all times</li></ul><h3>Forklift Zones</h3><ul><li>Separate forklift and pedestrian zones are clearly marked</li><li>Speed limit signage is installed throughout the facility</li><li>Mirrors are located at all blind corners</li><li>Marked pedestrian crossings must be used at all times</li></ul><h3>Loading &amp; Unloading Areas</h3><ul><li>Designated loading/unloading areas only — do not block aisles</li><li>Dock area: authorised dock staff and relevant drivers only during operations</li><li>Wheel chocks must be applied before any truck door is opened</li></ul><h3>Access &amp; Security</h3><ul><li>Carry your access card at all times on site</li><li>Never share or lend your access card</li><li>Report lost or stolen cards to security immediately</li><li>CCTV operates 24/7 throughout the facility</li></ul>','3:30',5,0],
  [inductionId,'Induction Assessment','<h2>Induction Assessment</h2><p>Complete this assessment with a score of at least <strong>70%</strong> to be cleared for on-site work. You may retake if you do not pass first time.</p>','6:00',6,1],
  [toolboxId,'Personal Protective Equipment (PPE)','<h2>Personal Protective Equipment (PPE)</h2><p>PPE is your last line of defence against workplace injury. Wearing the correct PPE in the correct area is mandatory at all times. Damaged PPE must be replaced immediately.</p><h3>Mandatory PPE by Area</h3><table style="width:100%;border-collapse:collapse;margin:12px 0"><thead><tr style="background:#1e1b4b"><th style="padding:8px 12px;text-align:left;color:#a78bfa;border:1px solid #374151">Area</th><th style="padding:8px 12px;text-align:left;color:#a78bfa;border:1px solid #374151">PPE Required</th></tr></thead><tbody><tr style="background:#111827"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">General Warehouse</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Hi-vis vest/shirt &amp; safety boots</td></tr><tr style="background:#1f2937"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Cold Room</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Thermal jacket, insulated gloves &amp; beanie</td></tr><tr style="background:#111827"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Cleaning Activities</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Gloves &amp; eye protection</td></tr><tr style="background:#1f2937"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Forklift Operations</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Safety boots &amp; hi-vis vest</td></tr><tr style="background:#111827"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Dispatch Dock</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Hi-vis vest &amp; safety boots</td></tr><tr style="background:#1f2937"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Pick Packing</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Hi-vis vest, safety boots &amp; gloves where required</td></tr></tbody></table><h3>PPE Rules</h3><ul><li>PPE must be worn at all times in designated areas — no exceptions</li><li>Inspect your PPE at the start of every shift</li><li>Damaged PPE must be replaced immediately — report to supervisor</li><li>Supervisors monitor PPE compliance daily</li></ul><h3>Cold Room PPE</h3><p>Thermal vest/jacket, insulated gloves, and beanie are mandatory inside the cold room. Cold room PPE is available at the cold room entrance. Limit your exposure time and never work alone for extended periods in the cold room.</p>','4:20',1,0],
  [toolboxId,'Forklift & MHE Safety','<h2>Forklift &amp; Material Handling Equipment Safety</h2><p>Forklifts are among the most common causes of serious injury in warehouse environments. All operators must be licenced, trained, and compliant at all times.</p><h3>Licencing Requirements</h3><ul><li>All operators must hold a valid <strong>LF (High Risk Work) Licence</strong></li><li>Carry your licence on your person at all times when operating</li><li>Complete the site-specific forklift assessment before operating on site</li><li>Expired licences — no grace period, renew before operating</li></ul><h3>Pre-Start Inspection — 11 Point Check</h3><ul><li>Horn — must be clearly audible</li><li>Brakes — must operate correctly and promptly</li><li>Steering — check for smooth, responsive operation</li><li>Tyres — check for damage, cuts, or excessive wear</li><li>Forks — inspect for cracks, bends, or damage</li><li>Mast &amp; chains — check for wear and adequate lubrication</li><li>Seatbelt — functional and not frayed</li><li>Lights &amp; warning beacon — test operation</li><li>Reverse alarm — must activate when reversing</li><li>Battery/fuel levels — confirm adequate for the shift</li><li>Leaks or damage — check hydraulic oil, fuel, LPG lines</li></ul><h3>Site Speed Limits</h3><ul><li>General Warehouse: <strong>8 km/h maximum</strong></li><li>Cold Room: <strong>5 km/h maximum</strong></li><li>Dock Area: <strong>5 km/h maximum</strong></li></ul><h3>Operating Rules</h3><ul><li>Wear seatbelt at all times when operating</li><li>Travel with forks lowered (150–200mm from floor) when not lifting</li><li>Sound horn at all blind corners, intersections, and dock entries</li><li>Never carry unauthorised passengers — one operator only</li><li>Never exceed the rated load capacity on the data plate</li><li>Do not use a mobile phone while operating</li><li>Lower forks to floor and apply handbrake when parked</li></ul><h3>Cold Room Forklift Rules</h3><ul><li>Reduce speed to 5 km/h inside cold rooms</li><li>Watch for slippery floors — especially near the entrance</li><li>Minimise door opening time to preserve temperature</li><li>Wear thermal PPE when operating in cold room</li></ul><h3>Pedestrian Safety</h3><ul><li>Pedestrians always have right of way</li><li>Come to a complete stop if a pedestrian is nearby</li><li>Forklifts must stop at all pedestrian crossings</li><li>Maintain separation zones at all times</li></ul>','5:50',2,0],
  [toolboxId,'Racking & Storage Systems','<h2>3-Level Racking &amp; Storage Systems</h2><p>Racking failures cause catastrophic injuries. Our 3-level pallet racking system requires regular inspection, careful loading, and immediate reporting of any damage found.</p><h3>3-Level Racking Requirements</h3><ul><li>Load ratings must be clearly displayed on every bay — never exceed them</li><li>Conduct weekly visual inspections before operating near racking</li><li>Annual professional inspection by a certified racking engineer</li><li>Protect uprights with guards at forklift traffic areas</li><li>Maintain clear aisle access at all times</li><li>No damaged pallets on upper levels</li></ul><h3>Weekly Racking Inspection Checklist</h3><table style="width:100%;border-collapse:collapse;margin:12px 0"><thead><tr style="background:#1e1b4b"><th style="padding:8px 12px;text-align:left;color:#a78bfa;border:1px solid #374151">Inspection Item</th><th style="padding:8px 12px;text-align:left;color:#a78bfa;border:1px solid #374151">Check</th></tr></thead><tbody><tr style="background:#111827"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Bent uprights</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Yes / No</td></tr><tr style="background:#1f2937"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Damaged beams</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Yes / No</td></tr><tr style="background:#111827"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Loose locking pins</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Yes / No</td></tr><tr style="background:#1f2937"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Unsafe pallets</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Yes / No</td></tr><tr style="background:#111827"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Overloaded bays</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Yes / No</td></tr><tr style="background:#1f2937"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Leaning racking</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Yes / No</td></tr><tr style="background:#111827"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Impact damage</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Yes / No</td></tr><tr style="background:#1f2937"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Obstructed aisles</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Yes / No</td></tr></tbody></table><h3>If Damage is Found — Immediate Actions</h3><ol><li>Isolate the affected area immediately</li><li>Tag the unsafe section with a "Do Not Use" tag</li><li>Notify your supervisor straight away</li><li>Arrange repairs before the bay is returned to use</li></ol><h3>Correct Loading</h3><ul><li>Heavier items on lower shelves always</li><li>Distribute weight evenly across the bay</li><li>Pallet overhang must not exceed 50mm per side</li><li>Never block emergency exits or fire equipment with product</li><li>Personnel must not climb racking — use approved EWP for upper levels</li></ul>','3:55',3,0],
  [toolboxId,'Pest Control & Hazardous Materials','<h2>Pest Control &amp; Hazardous Materials</h2><p>A Grade 3 warehouse must maintain an active pest management program and handle all hazardous materials in strict compliance with safety requirements.</p><h3>Pest Control Program Requirements</h3><ul><li>Licensed pest control contractor on scheduled inspections</li><li>Bait stations installed and maintained across the site</li><li>Insect light traps maintained and catch boards replaced regularly</li><li>Rodent monitoring and pest trend analysis records kept</li><li>Corrective action reports completed after each contractor visit</li></ul><h3>Pest Control Audit File Must Include</h3><ul><li>Contractor service reports</li><li>Site maps showing all bait station locations</li><li>Corrective actions completed</li><li>Chemical usage records</li><li>Pest sighting register</li><li>Audit certificates</li></ul><h3>Staff Pest Responsibilities</h3><ul><li>Report pest sightings immediately to supervisor</li><li>Keep dock doors and roller doors closed when not in use</li><li>Dispose of waste correctly — no food waste left in warehouse</li><li>Maintain clean storage areas at all times</li></ul><h3>Hazardous Materials Handling</h3><p>All chemical and hazardous goods must be handled per their Safety Data Sheet (SDS). The SDS is available at the point of use for every hazardous substance.</p><ul><li>Store chemicals in the designated chemical store only</li><li>Flammables in approved cabinets, away from ignition sources</li><li>Never store incompatible chemicals together</li><li>Do not pick damaged or leaking containers — isolate and report immediately</li><li>Wear PPE as specified in the SDS for that substance</li></ul>','4:40',4,0],
  [toolboxId,'Loading Dock & Cold Room Operations','<h2>Loading Dock &amp; Cold Room Operations</h2><p>The loading dock and cold room are two of the highest-risk areas in the warehouse. Follow all procedures without exception.</p><h3>Loading Dock Procedures</h3><ol><li>Direct driver to reverse slowly — use a spotter at all times</li><li>Apply wheel chocks before the driver exits the vehicle</li><li>Engage dock lock if fitted</li><li>Deploy dock leveller before forklift entry</li></ol><h3>Speed Limit — Dock Area: 5 km/h</h3><h3>During Dock Operations</h3><ul><li>Authorised dock staff and the relevant driver only — no unauthorised personnel</li><li>Check trailer floor integrity before driving forklift inside</li><li>Never drive a forklift onto an unsecured trailer</li><li>Keep dock doors closed when not actively in use</li></ul><h3>Cold Room Safety</h3><ul><li>Wear thermal PPE — jacket, gloves, beanie — before entering</li><li>Check that the internal emergency release handle is functional before each entry</li><li>Never work alone in the cold room for extended periods</li><li>Report refrigeration issues immediately — do not continue storing temperature-sensitive goods if temp is out of range</li><li>Keep cold room doors closed when not in use</li></ul><h3>Cold Room Temperature Requirements</h3><table style="width:100%;border-collapse:collapse;margin:12px 0"><thead><tr style="background:#1e1b4b"><th style="padding:8px 12px;text-align:left;color:#a78bfa;border:1px solid #374151">Area</th><th style="padding:8px 12px;text-align:left;color:#a78bfa;border:1px solid #374151">Monitoring Frequency</th></tr></thead><tbody><tr style="background:#111827"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Cold Room</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Minimum twice daily</td></tr><tr style="background:#1f2937"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Freezer (if applicable)</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Minimum twice daily</td></tr><tr style="background:#111827"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Refrigerated Dispatch Area</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Daily</td></tr></tbody></table><p>Acceptable temperature range for refrigerated storage: <strong>0°C to 4°C</strong>. If out of range — notify supervisor immediately.</p>','4:15',5,0],
  [toolboxId,'First Aid & Incident Reporting','<h2>First Aid &amp; Incident Reporting</h2><h3>First Aid Kit Locations</h3><ul><li>📦 Warehouse Office</li><li>🚚 Dispatch Area</li><li>🍽️ Lunchroom</li><li>❄️ Cold Room Entrance</li></ul><h3>Minimum First Aid Certifications</h3><table style="width:100%;border-collapse:collapse;margin:12px 0"><thead><tr style="background:#1e1b4b"><th style="padding:8px 12px;text-align:left;color:#a78bfa;border:1px solid #374151">Role</th><th style="padding:8px 12px;text-align:left;color:#a78bfa;border:1px solid #374151">Requirement</th></tr></thead><tbody><tr style="background:#111827"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">First Aid Officer</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Current First Aid Certificate</td></tr><tr style="background:#1f2937"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Forklift Drivers</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Valid LF Forklift Licence</td></tr><tr style="background:#111827"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Fire Wardens</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Fire Warden Training</td></tr><tr style="background:#1f2937"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Supervisors</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Incident Management Training</td></tr></tbody></table><h3>Reportable Incidents — Report All of These</h3><ul><li>Injuries (no matter how minor)</li><li>Near misses</li><li>Property damage</li><li>Racking impact</li><li>Forklift collisions</li><li>Product contamination</li><li>Chemical spills</li></ul><h3>Incident Reporting Process</h3><ol><li>Notify supervisor immediately</li><li>Make the area safe</li><li>Provide first aid if required</li><li>Complete the incident report form</li><li>Investigate the root cause</li><li>Implement corrective action to prevent recurrence</li></ol>','3:50',6,0],
  [toolboxId,'Toolbox Training Assessment','<h2>Toolbox Training Assessment</h2><p>Score at least <strong>70%</strong> to pass. You may retake if needed.</p>','6:00',7,1]
];
const lessonIds = {};
iLessons.forEach(([cid,title,content,dur,oi,hq]) => { lessonIds[`${cid}-${oi}`] = il.run(cid,title,content,dur,oi,hq).lastInsertRowid; });

// ── Quiz Questions ────────────────────────────────────────────────────────────
const iq = db.prepare(`INSERT INTO quiz_questions (lesson_id, question, order_index, image_url) VALUES (?, ?, ?, ?)`);
const io = db.prepare(`INSERT INTO quiz_options (question_id, option_text, is_correct) VALUES (?, ?, ?)`);
const addQ = (lid, questions) => questions.forEach((q,i) => {
  const qid = iq.run(lid, q.q, i+1, q.img || null).lastInsertRowid;
  q.opts.forEach(o => io.run(qid, o.t, o.c ? 1 : 0));
});

addQ(lessonIds[`${inductionId}-6`], [
  { q:'What should you do immediately when you discover a fire?',
    img:'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=700&q=75',
    opts:[{t:'Activate the fire alarm and evacuate immediately',c:true},{t:'Try to extinguish it yourself first',c:false},{t:'Wait to see if it grows before raising the alarm',c:false},{t:'Collect your belongings then exit',c:false}]},
  { q:'Maximum recommended weight for a single manual lift (men) without assistance?',
    img:'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=700&q=75',
    opts:[{t:'25 kg',c:true},{t:'10 kg',c:false},{t:'40 kg',c:false},{t:'50 kg',c:false}]},
  { q:'You notice a safety hazard that is not an immediate emergency. What do you do?',
    img:'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=700&q=75',
    opts:[{t:'Report to supervisor and complete a hazard report form',c:true},{t:'Ignore it if it doesn\'t affect your task',c:false},{t:'Fix it yourself without telling anyone',c:false},{t:'Wait until end of shift',c:false}]},
  { q:'Which behaviour violates our workplace conduct policy?',
    img:'https://images.unsplash.com/photo-1497366216548-37526070297c?w=700&q=75',
    opts:[{t:'Making personal calls on the warehouse floor during work hours',c:true},{t:'Reporting a near-miss to your supervisor',c:false},{t:'Wearing your access card visibly',c:false},{t:'Using correct manual handling technique',c:false}]},
  { q:'During a fire emergency, which evacuation route should you use?',
    img:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=75',
    opts:[{t:'Nearest clearly marked emergency exit, using stairs',c:true},{t:'The lift — it\'s the fastest route',c:false},{t:'Main entrance only, regardless of distance',c:false},{t:'Any unlocked door you can find',c:false}]}
]);
addQ(lessonIds[`${toolboxId}-7`], [
  { q:'What does DAMP stand for in a forklift pre-operation check?',
    img:'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=700&q=75',
    opts:[{t:'Documentation, Around, Mast, Power',c:true},{t:'Drive, Adjust, Monitor, Park',c:false},{t:'Detect, Assess, Manage, Proceed',c:false},{t:'Daily, Around, Maintain, Power',c:false}]},
  { q:'What must be done BEFORE opening a loading dock door?',
    img:'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=700&q=75',
    opts:[{t:'Apply wheel chocks and confirm vehicle is secured',c:true},{t:'Call the transport company',c:false},{t:'Ensure forklift battery is charged',c:false},{t:'Nothing — just open the door',c:false}]},
  { q:'What PPE is mandatory in ALL operational zones?',
    img:'https://images.unsplash.com/photo-1615789591457-74a63395c990?w=700&q=75',
    opts:[{t:'Hi-vis vest and safety boots',c:true},{t:'Hard hat and gloves only',c:false},{t:'Safety glasses and face shield',c:false},{t:'Ear protection and knee pads',c:false}]},
  { q:'Where do you find procedures for responding to a chemical spill?',
    img:'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=700&q=75',
    opts:[{t:'The Safety Data Sheet (SDS) for that chemical',c:true},{t:'The warehouse operations manual',c:false},{t:'Ask a colleague',c:false},{t:'Search online',c:false}]},
  { q:'Maximum speed for a forklift in a pedestrian zone?',
    img:'https://images.unsplash.com/photo-1553413077-190dd305871c?w=700&q=75',
    opts:[{t:'5 km/h',c:true},{t:'10 km/h',c:false},{t:'15 km/h',c:false},{t:'20 km/h',c:false}]},
  { q:'What should you do if you identify a near-miss incident?',
    img:'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=700&q=75',
    opts:[{t:'Report to supervisor and complete an incident report form',c:true},{t:'Ignore it — nobody was hurt',c:false},{t:'Only report if it happens again',c:false},{t:'Tell a colleague but not a supervisor',c:false}]}
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
addCL('Daily Cleaning Checklist', catCleaning, 'daily', pickPackerId, 'Complete every shift before starting operations.',
[{t:'Sweep all floors and remove debris from all aisles',c:1},{t:'Empty all rubbish bins and sanitize',c:1},{t:'Wipe and disinfect all packing stations',c:1},{t:'Clean lunchroom — tables, microwave, and sink',c:1},{t:'Sanitize toilets and restock supplies',c:1},{t:'Remove and dispose of plastic wrap waste',c:1},{t:'Clear receiving area — remove pallets and rubbish',c:1},{t:'Clean and organise dispatch area',c:1},{t:'Wipe keyboards, desks, and monitors at computer stations'},{t:'Remove rubbish from forklifts and inspect cleanliness'},{t:'Mop wet areas — dock and cold room entrance'},{t:'Ensure all spill kits are fully stocked',c:1},{t:'Inspect floors for slip/trip hazards and rectify',c:1},{t:'Ensure correct waste separation (cardboard, general, recyclable)'}]);

// Weekly Deep Clean
addCL('Weekly Deep Clean Checklist', catCleaning, 'weekly', supervisorId, 'Complete all areas every week — full scrub and sanitisation.',
[{t:'Deep clean and sanitize all wash sinks',c:1},{t:'Full scrub and wash of all floor surfaces',c:1},{t:'Pressure clean all bins',c:1},{t:'Remove and safely dispose of all damaged pallets',c:1},{t:'Remove plastic wrap build-up from all aisles',c:1},{t:'Sanitize and inspect cold room floors',c:1},{t:'Dust and inspect racking for damage',c:1},{t:'Deep clean lunchroom refrigerator and microwave',c:1},{t:'Dust cables and equipment at all computer stations'},{t:'Clean dock door tracks and remove debris',c:1},{t:'Inspect and clean all pedestrian walkways'},{t:'Ensure all fire exits are clear and unobstructed',c:1},{t:'Clean all amenities including grout and fixtures',c:1},{t:'Sanitise all high-touch points (door handles, railings)',c:1},{t:'Supervisor sign-off on weekly deep clean record',c:1}]);

// Monthly Cleaning Tasks
addCL('Monthly Cleaning Tasks', catCleaning, 'monthly', supervisorId, 'Complete all monthly deep-clean and maintenance tasks.',
[{t:'High-level dust removal from racking, beams, and ceiling fixtures',c:1},{t:'Cold room deep sanitation — internal surfaces, shelving, and floor',c:1},{t:'Pest prevention inspection of all bait stations and traps',c:1},{t:'Clean all floor drains — remove build-up and flush',c:1},{t:'Warehouse wall cleaning — all internal walls wiped down'},{t:'Lighting inspection and cleaning — replace faulty globes',c:1},{t:'Inspect and clean all ventilation grilles and exhaust fans'},{t:'Inspect external perimeter for pest harborage areas'},{t:'Review and countersign pest control contractor report',c:1},{t:'Supervisor sign-off on monthly cleaning record',c:1}]);

// Pest Control Monthly
addCL('Pest Control Monthly Inspection', catPest, 'monthly', supervisorId, 'Conducted monthly by trained staff prior to contractor visit.',
[{t:'Inspect all bait stations — check bait levels and condition',c:1},{t:'Check for rodent activity evidence (droppings, gnaw marks)',c:1},{t:'Inspect dock seals for gaps or damage',c:1},{t:'Check all floor drains for pest entry points'},{t:'Inspect product storage areas for insect activity'},{t:'Review and countersign pest control contractor report',c:1},{t:'Review pest sighting log for recent reports'},{t:'Inspect external perimeter for harborage areas'},{t:'Confirm bait station site map is current'},{t:'Check insect light traps and replace catch boards',c:1}]);

// Daily Supervisor Safety Check
addCL('Daily Supervisor Safety Check', catSafety, 'daily', supervisorId, 'Complete opening and closing checks every shift. Must be signed by the supervisor.',
[{t:'OPENING — Warehouse secure and access confirmed',c:1},{t:'OPENING — All emergency exits are clear and unobstructed',c:1},{t:'OPENING — Forklift pre-operation checklists have been completed',c:1},{t:'OPENING — Racking visually checked for damage or unsafe pallets',c:1},{t:'OPENING — Cold room temperatures recorded and within range (0°C–4°C)',c:1},{t:'OPENING — PPE available and all staff wearing correct PPE',c:1},{t:'OPENING — Site cleanliness acceptable — no hazards identified',c:1},{t:'OPENING — Review incidents or near-misses from prior shift'},{t:'CLOSING — All waste removed from warehouse and dock areas',c:1},{t:'CLOSING — Forklifts parked safely in designated area, forks lowered',c:1},{t:'CLOSING — Forklift batteries on charge if required'},{t:'CLOSING — All doors and dock doors secured',c:1},{t:'CLOSING — Cold room checked and temperature recorded',c:1},{t:'CLOSING — Lights turned off in all applicable areas'},{t:'CLOSING — All incident reports completed and filed',c:1},{t:'Supervisor signature and date on daily safety register',c:1}]);

// Forklift Pre-Operation
addCL('Forklift Pre-Operation Checklist', catSafety, 'daily', forkliftId, 'Complete before every forklift operation. Do not operate if any item is faulty.',
[{t:'Horn — must be clearly audible, test before every shift',c:1},{t:'Brakes — must operate correctly and promptly',c:1},{t:'Steering — check for smooth, responsive operation',c:1},{t:'Tyres — inspect for damage, cuts, or excessive wear',c:1},{t:'Forks — inspect for cracks, bends, or damage',c:1},{t:'Mast and chains — check for wear and adequate lubrication',c:1},{t:'Seatbelt — functional, not frayed, and latches correctly',c:1},{t:'Lights and warning beacon — test operation',c:1},{t:'Reverse alarm — must activate when reversing',c:1},{t:'Battery/fuel levels — confirm adequate for the shift',c:1},{t:'Leaks or damage — check hydraulic oil, fuel, LPG lines',c:1},{t:'Verify rated capacity plate is visible and legible',c:1},{t:'Sign and date the pre-operation checklist',c:1}]);

// Weekly Racking Inspection
addCL('Weekly Racking Inspection', catSafety, 'weekly', supervisorId, 'Conduct weekly visual inspection of all 3-level racking. Isolate and tag any damaged sections immediately.',
[{t:'Bent uprights — inspect all uprights throughout the facility',c:1},{t:'Damaged beams — check all horizontal beam members',c:1},{t:'Loose locking pins — verify all beam-end safety pins are seated',c:1},{t:'Unsafe pallets — check for unstable or damaged pallets on racking',c:1},{t:'Overloaded bays — verify no bay exceeds its posted load rating',c:1},{t:'Leaning racking — check uprights are plumb and not leaning',c:1},{t:'Impact damage — inspect base of uprights for forklift strike damage',c:1},{t:'Obstructed aisles — all aisles must be clear and accessible',c:1},{t:'Annual professional racking inspection date is current'},{t:'Supervisor sign-off on weekly racking inspection record',c:1}]);

// Cold Room Check
addCL('Cold Room Safety & Compliance Check', catSafety, 'weekly', supervisorId, 'Weekly check of cold room safety systems and staff compliance.',
[{t:'Cold room door alarm is functional — test activation',c:1},{t:'Internal emergency release handle is accessible and working',c:1},{t:'Temperature log is current and within acceptable range',c:1},{t:'All staff briefed on cold room entry procedures'},{t:'Cold-weather PPE is available (thermal vest, gloves, hat)',c:1},{t:'Internal lighting is fully functional',c:1},{t:'No products blocking emergency door or exit path',c:1},{t:'Cold room floor is free of ice or slip hazards',c:1}]);

// PPE Weekly Check
addCL('PPE Compliance Check', catPPE, 'weekly', supervisorId, 'Weekly audit of PPE availability, condition, and compliance.',
[{t:'All floor staff are wearing hi-vis vests',c:1},{t:'All staff wearing safety boots in operational areas',c:1},{t:'Hard hats available and in good condition in dock/racking areas',c:1},{t:'Safety glasses available and worn where required',c:1},{t:'Cut-resistant gloves available for manual handling tasks'},{t:'Chemical-resistant gloves available in chemical store',c:1},{t:'All PPE is in good condition — no damage or excessive wear',c:1},{t:'PPE storage areas are organised and clearly labelled'}]);

// Emergency Equipment
addCL('Emergency Equipment Weekly Check', catEmergency, 'weekly', supervisorId, 'Verify all emergency systems and equipment are operational.',
[{t:'All fire extinguishers are in correct marked locations',c:1},{t:'Fire extinguisher pressure gauges are in the green zone',c:1},{t:'Fire hose reels are accessible and in good condition',c:1},{t:'All emergency exit doors open freely and are unobstructed',c:1},{t:'Emergency lighting is functional — test activation',c:1},{t:'First aid kits are fully stocked — review contents list',c:1},{t:'Eyewash stations are functional, clean, and accessible',c:1},{t:'Emergency contacts board is current and clearly visible',c:1},{t:'Spill kits are fully stocked and accessible'},{t:'AED defibrillator is charged and accessible (if on site)',c:1}]);

// Traffic Management
addCL('Daily Traffic Management Compliance', catTraffic, 'daily', supervisorId, 'Ensure vehicle and pedestrian separation is maintained.',
[{t:'All pedestrian walkways are clearly marked and unobstructed',c:1},{t:'Forklift/pedestrian separation barriers are in place',c:1},{t:'Speed limit signs are clearly visible and undamaged'},{t:'Forklifts observed operating within speed limits',c:1},{t:'Traffic flow mirrors are clean and correctly positioned'},{t:'Loading dock area clear of unauthorised pedestrians',c:1},{t:'Visitor sign-in register is current'},{t:'No vehicles parked in fire lanes or pedestrian areas',c:1}]);

// New Employee Induction
addCL('New Employee Induction Checklist', catWHS, 'one-time', supervisorId, 'Complete for every new employee on their first day.',
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

<h3>3. Site Speed Limits</h3>
<ul><li>General Warehouse: <strong>8 km/h maximum</strong></li><li>Cold Room: <strong>5 km/h maximum</strong></li><li>Dock Area: <strong>5 km/h maximum</strong></li></ul>

<h3>4. Safe Operating Rules</h3>
<ul><li>Always travel with forks lowered (150–200mm from the floor) when not lifting.</li><li>Sound the horn at all blind corners, intersections, and before entering/exiting dock doors.</li><li>Never carry unauthorised passengers — one operator only.</li><li>Never exceed the rated load capacity shown on the data plate.</li><li>Wear your seatbelt at all times when operating.</li><li>Do not use a mobile phone while operating.</li></ul>

<h3>5. Load Handling</h3>
<ul><li>Ensure loads are stable and secure before lifting.</li><li>Tilt the mast back when carrying loads.</li><li>Never lift people on the forks — use an approved work platform only.</li><li>Approach racking slowly and carefully — align before inserting forks.</li><li>Do not overload rack levels — follow posted bay load limits.</li></ul>

<h3>6. Pedestrian Interaction</h3>
<ul><li>Pedestrians always have right of way.</li><li>Come to a complete stop if a pedestrian is nearby.</li><li>Forklifts must stop at all marked pedestrian crossings.</li><li>Maintain separation zones at all times.</li></ul>

<h3>7. Cold Room Operations</h3>
<ul><li>Reduce speed to 5 km/h inside cold rooms.</li><li>Watch for slippery floors — especially near the entrance.</li><li>Minimise cold room door opening time to preserve temperature.</li><li>Wear thermal PPE when operating inside cold room.</li></ul>

<h3>8. Parking</h3>
<ul><li>Park only in designated forklift parking areas.</li><li>Lower forks to the floor, apply the handbrake, and turn off the ignition when parking.</li><li>Never leave a running forklift unattended.</li></ul>`,
'2.1', 'Worker,Supervisor', u3, '2026-02-01');

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

<h3>2. Site Speed Limits</h3>
<ul><li>General Warehouse: maximum <strong>8 km/h</strong></li><li>Cold Room: maximum <strong>5 km/h</strong></li><li>Dock Area: maximum <strong>5 km/h</strong></li><li>External truck movements: follow the site's one-way traffic circuit.</li></ul>

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

isop.run('Mandatory Compliance Requirements', 'Compliance', 'Schedule of all mandatory compliance documents, inspections, and records required for a Grade 3 warehouse facility.',
`<h2>Mandatory Compliance Requirements</h2>
<p>The following compliance documents and records must be maintained at all times for a Grade 3 Storage &amp; Distribution warehouse. This schedule is based on the Warehouse Compliance Induction Manual.</p>

<h3>Compliance Schedule</h3>
<table style="width:100%;border-collapse:collapse;margin:12px 0">
<thead><tr style="background:#1e1b4b">
<th style="padding:8px 12px;text-align:left;color:#a78bfa;border:1px solid #374151">Requirement</th>
<th style="padding:8px 12px;text-align:left;color:#a78bfa;border:1px solid #374151">Frequency</th>
<th style="padding:8px 12px;text-align:left;color:#a78bfa;border:1px solid #374151">Responsible Person</th>
</tr></thead>
<tbody>
<tr style="background:#111827"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Pest Control Audit Reports</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Monthly / Quarterly</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Site Manager</td></tr>
<tr style="background:#1f2937"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Forklift Service Records</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">As per maintenance schedule</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Maintenance Team</td></tr>
<tr style="background:#111827"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Racking Inspection Reports</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Annually + weekly visual checks</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Warehouse Supervisor</td></tr>
<tr style="background:#1f2937"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">First Aid Certifications</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Renew as required</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">HR / Safety Officer</td></tr>
<tr style="background:#111827"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Fire Extinguisher Inspection</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Every 6 months</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Approved Contractor</td></tr>
<tr style="background:#1f2937"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Emergency Evacuation Drill</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Every 6 months</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Safety Officer</td></tr>
<tr style="background:#111827"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Cold Room Temperature Logs</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Daily (minimum twice per day)</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Warehouse Team</td></tr>
<tr style="background:#1f2937"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Cleaning Schedule Records</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Daily / Weekly</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Cleaning Team</td></tr>
<tr style="background:#111827"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Incident Reports</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">As required</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Supervisor</td></tr>
<tr style="background:#1f2937"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Staff Induction Records</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">On commencement</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">HR / Supervisor</td></tr>
<tr style="background:#111827"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">SWMS / SOP Review</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Annually</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Management</td></tr>
<tr style="background:#1f2937"><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">PPE Compliance Checks</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Daily</td><td style="padding:8px 12px;border:1px solid #374151;color:#e5e7eb">Supervisors</td></tr>
</tbody></table>

<h3>Recommended Additional Documents</h3>
<ul>
<li>SWMS (Safe Work Method Statements)</li>
<li>HACCP documentation (if food products are handled)</li>
<li>Temperature monitoring logs</li>
<li>Forklift maintenance register</li>
<li>Visitor sign-in register</li>
<li>Contractor induction forms</li>
<li>Chemical Safety Data Sheets (SDS)</li>
<li>Equipment maintenance logs</li>
<li>Daily forklift pre-start checklists</li>
<li>Pallet inspection checklist</li>
<li>Injury register &amp; hazard register</li>
<li>Corrective action register</li>
</ul>

<h3>Document Review Schedule</h3>
<ul>
<li>Safety Procedures — Annually</li>
<li>Cleaning Schedules — Quarterly</li>
<li>Induction Program — Annually</li>
<li>Emergency Procedures — Annually</li>
<li>Traffic Management Plan — Annually</li>
<li>Risk Assessments — Annually</li>
</ul>`,
'1.0', 'Supervisor,Manager', u5, '2026-01-01');

isop.run('Pick Packer Safety Procedures — Grade 3', 'Safety', 'Updated safety procedures for all pick packer staff based on Grade 3 Warehouse Compliance Manual.',
`<h2>Pick Packer Safety Procedures</h2>
<p>This SOP applies to all staff performing pick and pack operations. All pick packers must read, understand, and sign off on these procedures before commencing work.</p>

<h3>1. General Safety Rules</h3>
<ul>
<li>Wear mandatory PPE at all times on the warehouse floor</li>
<li>Follow all designated pedestrian walkways — never cut through forklift zones</li>
<li>Use correct manual handling and lifting techniques at all times</li>
<li>Report hazards, near-misses, and incidents to your supervisor immediately</li>
<li>Maintain a clean and organised workstation throughout the shift</li>
<li>Follow RF scanner procedures correctly</li>
</ul>

<h3>2. Mandatory PPE</h3>
<ul>
<li>High visibility vest or shirt — mandatory at all times on the warehouse floor</li>
<li>Safety boots (steel-capped) — mandatory in all operational areas</li>
<li>Gloves where required (particularly for manual handling and sharp products)</li>
<li>Thermal jacket and insulated gloves when working in or near cold room</li>
</ul>

<h3>3. Manual Handling</h3>
<ul>
<li>Bend knees when lifting — keep back straight and load close to the body</li>
<li>Avoid twisting while lifting or carrying loads</li>
<li>Use trolleys or pallet jacks for heavy or bulky items</li>
<li>Seek assistance for oversized loads — do not attempt alone</li>
</ul>

<h3>4. Pick Packing Procedures</h3>
<ol>
<li>Verify all picking documentation before starting</li>
<li>Confirm correct product codes before picking</li>
<li>Check product condition — report damaged or contaminated product immediately</li>
<li>Follow FIFO (First In, First Out) rotation at all times</li>
<li>Stack cartons safely and evenly — do not exceed safe stack height</li>
<li>Secure pallets properly before moving</li>
<li>Apply labels correctly and legibly</li>
<li>Wrap pallets securely with stretch wrap</li>
<li>Move completed pallets to the dispatch zone</li>
</ol>

<h3>5. Pedestrian Safety in Forklift Zones</h3>
<ul>
<li>Always use marked pedestrian walkways (yellow lined)</li>
<li>Make eye contact with forklift operators before crossing any vehicle path</li>
<li>Never walk behind a reversing forklift</li>
<li>Do not enter forklift zones without checking both directions</li>
</ul>

<h3>6. Racking Safety</h3>
<ul>
<li>Only access products from ground level unless specifically trained for elevated picking</li>
<li>Do not climb racking structures — use approved ladders or elevated work platforms</li>
<li>Report any damaged racking immediately to your supervisor</li>
<li>Do not exceed the shelf load limits posted on each bay</li>
</ul>

<h3>7. Prohibited Unsafe Behaviours</h3>
<ul>
<li>Climbing racking structures</li>
<li>Running anywhere in the warehouse</li>
<li>Blocking emergency exits or fire equipment</li>
<li>Unsafe or unstable stacking of cartons or pallets</li>
<li>Using damaged pallets for product storage or movement</li>
<li>Operating any equipment without authorisation</li>
</ul>

<h3>8. Incident Reporting</h3>
<p>All injuries, near-misses, and hazards must be reported to your supervisor immediately and recorded in the incident register. This includes minor cuts, trips, and equipment damage.</p>`,
'1.3', 'Worker,Supervisor', u3, '2026-01-15');

// ── Tasks ─────────────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];
const addDays = (d) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString().split('T')[0]; };
const it = db.prepare(`INSERT INTO tasks (title, description, category, assigned_to, assigned_role_id, due_date, priority, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const adminId = db.prepare('SELECT id FROM users WHERE role = ?').get('admin').id;

it.run('Complete WHS Induction - John Smith','Ensure new employee John Smith completes the full induction checklist and online induction training module.','induction',u1,null,addDays(1),'high','pending',adminId);
it.run('Complete WHS Induction - Sarah Johnson','Ensure new employee Sarah Johnson completes the full induction checklist and online induction training module.','induction',u2,null,addDays(2),'high','pending',adminId);
it.run('Monthly Pest Control Audit','Coordinate with pest control contractor and complete the monthly pest control inspection checklist.','audit',u3,null,addDays(7),'medium','pending',adminId);
it.run('Quarterly Safety Audit','Conduct quarterly internal WHS audit across all warehouse zones. Document findings and create action plan.','audit',null,headOpsId,addDays(14),'high','pending',adminId);
it.run('Update Training Records','Review and update all staff training records in the system. Identify any expired certifications.','compliance',u5,null,addDays(5),'medium','pending',adminId);
it.run('Toolbox Talk — Cold Room Safety','Conduct a 15-minute toolbox talk with all workers on cold room entry procedures and emergency release operation.','safety',u3,null,addDays(3),'medium','pending',adminId);
it.run('Review Emergency Evacuation Procedure','Review the current emergency evacuation procedure and ensure muster point signage is current.','compliance',null,headOpsId,addDays(10),'medium','pending',adminId);
it.run('Forklift Operator Licence Check','Verify that all forklift operators hold current, valid LF licences. Document expiry dates.','compliance',u3,null,addDays(4),'high','pending',adminId);
it.run('Implement New Racking SOP','Distribute updated 3-Level Racking SOP to all staff and obtain signed acknowledgements.','sop',null,supervisorId,addDays(7),'medium','pending',adminId);
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
