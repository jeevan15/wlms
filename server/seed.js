// node:sqlite returns { lastInsertRowid } from stmt.run()
const db = require('./db');
const bcrypt = require('bcryptjs');

console.log('Seeding database...');

// Clear existing data
db.exec(`
  DELETE FROM quiz_options;
  DELETE FROM quiz_questions;
  DELETE FROM user_progress;
  DELETE FROM quiz_attempts;
  DELETE FROM lessons;
  DELETE FROM courses;
  DELETE FROM users;
`);

// Create admin user
const adminHash = bcrypt.hashSync('admin123', 10);
db.prepare(`INSERT INTO users (name, email, password, role, department) VALUES (?, ?, ?, ?, ?)`).run(
  'Admin User', 'admin@warehouse.com', adminHash, 'admin', 'Management'
);

// Create sample employees
const userHash = bcrypt.hashSync('user123', 10);
const users = [
  ['John Smith', 'john.smith@warehouse.com', userHash, 'user', 'Receiving'],
  ['Sarah Johnson', 'sarah.j@warehouse.com', userHash, 'user', 'Dispatch'],
  ['Mike Torres', 'mike.t@warehouse.com', userHash, 'user', 'Inventory'],
  ['Emma Wilson', 'emma.w@warehouse.com', userHash, 'user', 'Forklift Operations'],
];
const insertUser = db.prepare(`INSERT INTO users (name, email, password, role, department) VALUES (?, ?, ?, ?, ?)`);
users.forEach(u => insertUser.run(...u));

// Course 1: Induction Training
const inductionId = db.prepare(`
  INSERT INTO courses (title, description, category, color, icon)
  VALUES (?, ?, ?, ?, ?)
`).run(
  'Induction Training',
  'Your essential guide to getting started at our warehouse. Covers company policies, safety fundamentals, emergency procedures, and workplace conduct.',
  'Induction',
  '#7C3AED',
  'building'
).lastInsertRowid;

// Course 2: Toolbox Training
const toolboxId = db.prepare(`
  INSERT INTO courses (title, description, category, color, icon)
  VALUES (?, ?, ?, ?, ?)
`).run(
  'Toolbox Training',
  'Hands-on safety training for warehouse operations. Covers PPE, forklift safety, hazardous materials, loading dock procedures, and first aid.',
  'Safety',
  '#DC2626',
  'tool'
).lastInsertRowid;

// Induction Lessons
const inductionLessons = [
  {
    title: 'Welcome & Company Overview',
    duration: '3:45',
    order_index: 1,
    has_quiz: 0,
    content: `<h2>Welcome to the Team!</h2>
<p>We're delighted to have you join our warehouse family. This module will give you a comprehensive overview of our company, its values, and what we expect from every team member.</p>

<h3>Our Company Mission</h3>
<p>We are committed to delivering excellence in logistics and warehousing, ensuring that every product reaches its destination safely, on time, and in perfect condition.</p>

<h3>Core Values</h3>
<ul>
  <li><strong>Safety First</strong> — The wellbeing of our team is our number one priority.</li>
  <li><strong>Integrity</strong> — We do what we say, and we say what we mean.</li>
  <li><strong>Teamwork</strong> — We succeed together as one cohesive unit.</li>
  <li><strong>Continuous Improvement</strong> — We constantly look for better ways to work.</li>
</ul>

<h3>Site Layout</h3>
<p>Our facility spans 50,000 square metres and is divided into the following zones:</p>
<ul>
  <li>Receiving Bay (Zone A)</li>
  <li>Storage Racking (Zones B, C, D)</li>
  <li>Pick & Pack Area (Zone E)</li>
  <li>Dispatch Bay (Zone F)</li>
  <li>Staff Amenities (Zone G)</li>
</ul>

<h3>Shift Patterns</h3>
<p>We operate three shifts: Day (6am–2pm), Afternoon (2pm–10pm), and Night (10pm–6am). Your roster will be provided by your supervisor.</p>`
  },
  {
    title: 'Health & Safety Fundamentals',
    duration: '5:20',
    order_index: 2,
    has_quiz: 0,
    content: `<h2>Health & Safety Fundamentals</h2>
<p>Health and safety is not just a legal requirement — it is our moral duty to ensure everyone goes home safe at the end of every shift.</p>

<h3>Your Responsibilities</h3>
<ul>
  <li>Follow all safety instructions and procedures at all times.</li>
  <li>Use appropriate Personal Protective Equipment (PPE) in designated areas.</li>
  <li>Report any hazards, near-misses, or incidents to your supervisor immediately.</li>
  <li>Never operate equipment you have not been trained to use.</li>
  <li>Keep your work area clean and free of obstructions.</li>
</ul>

<h3>Hazard Identification</h3>
<p>A hazard is anything that has the potential to cause harm. Common warehouse hazards include:</p>
<ul>
  <li>Wet or slippery floors</li>
  <li>Unsecured loads on racking</li>
  <li>Forklift traffic areas</li>
  <li>Heavy manual lifting</li>
  <li>Electrical hazards</li>
</ul>

<h3>Reporting a Hazard</h3>
<ol>
  <li>Stop work if there is an immediate danger.</li>
  <li>Alert nearby workers.</li>
  <li>Report to your supervisor or safety officer immediately.</li>
  <li>Complete a hazard report form (available at the supervisor's station).</li>
</ol>

<h3>Manual Handling Guidelines</h3>
<p>The maximum recommended weight for a single lift is <strong>25kg for men</strong> and <strong>16kg for women</strong>. For anything heavier, use mechanical assistance or ask a colleague for help.</p>
<p>Always use the correct lifting technique: bend your knees, keep your back straight, hold the load close to your body.</p>`
  },
  {
    title: 'Emergency Procedures',
    duration: '4:10',
    order_index: 3,
    has_quiz: 0,
    content: `<h2>Emergency Procedures</h2>
<p>Knowing what to do in an emergency can save lives. Familiarise yourself with all emergency procedures before your first shift.</p>

<h3>Fire Emergency</h3>
<ol>
  <li><strong>Discover a fire?</strong> Activate the nearest fire alarm pull station.</li>
  <li><strong>Evacuate immediately</strong> — do not collect personal belongings.</li>
  <li>Use the nearest clearly marked emergency exit.</li>
  <li><strong>Never use lifts</strong> during a fire emergency.</li>
  <li>Proceed to your designated <strong>Muster Point</strong> (marked on site maps).</li>
  <li>Wait for a roll call from the Fire Warden.</li>
  <li><strong>Do not re-enter</strong> the building until the All Clear is given.</li>
</ol>

<h3>Medical Emergency</h3>
<ol>
  <li>Call for help immediately — dial <strong>000</strong> (Australia) or your site emergency number.</li>
  <li>Do not move an injured person unless they are in immediate danger.</li>
  <li>Contact the nearest First Aid Officer.</li>
  <li>First Aid kits are located at: Receiving Bay, Break Room, and Dispatch Office.</li>
</ol>

<h3>Spill Response</h3>
<p>For liquid spills: Place warning signs immediately, clean up using appropriate materials, dispose of waste correctly. For chemical spills, refer to the relevant Safety Data Sheet (SDS) and contact your supervisor.</p>

<h3>Emergency Contacts</h3>
<ul>
  <li>Emergency Services: 000</li>
  <li>Site Emergency Number: Extension 911</li>
  <li>Safety Officer: Extension 201</li>
  <li>Site Manager: Extension 100</li>
</ul>`
  },
  {
    title: 'Workplace Conduct & HR Policies',
    duration: '4:55',
    order_index: 4,
    has_quiz: 0,
    content: `<h2>Workplace Conduct & HR Policies</h2>
<p>We are committed to maintaining a safe, respectful, and productive workplace for everyone.</p>

<h3>Code of Conduct</h3>
<p>All employees are expected to:</p>
<ul>
  <li>Treat all colleagues, visitors, and customers with respect and professionalism.</li>
  <li>Arrive on time and ready to work.</li>
  <li>Follow all company policies and procedures.</li>
  <li>Maintain confidentiality of company and customer information.</li>
  <li>Report any unethical behaviour to your supervisor or HR.</li>
</ul>

<h3>Anti-Discrimination & Harassment Policy</h3>
<p>We have a zero-tolerance policy for discrimination, bullying, and harassment of any kind. This includes behaviour based on race, gender, age, religion, disability, or any other characteristic. Any breach of this policy will result in disciplinary action, up to and including termination.</p>

<h3>Drug & Alcohol Policy</h3>
<p>Working under the influence of drugs or alcohol is strictly prohibited and is grounds for immediate dismissal. Random testing may be conducted in accordance with local regulations.</p>

<h3>Mobile Phone Policy</h3>
<p>Mobile phones must be kept on silent in operational areas. Personal calls should only be made during designated break times. Headphones are not permitted on the warehouse floor.</p>

<h3>Leave & Attendance</h3>
<p>If you are unable to attend a shift, you must notify your supervisor at least 2 hours before your shift starts. Unplanned absences must be followed by a medical certificate if the absence exceeds 2 consecutive days.</p>`
  },
  {
    title: 'Site Security & Access Control',
    duration: '3:30',
    order_index: 5,
    has_quiz: 0,
    content: `<h2>Site Security & Access Control</h2>
<p>Maintaining site security protects our people, our products, and our business.</p>

<h3>Access Cards</h3>
<p>You will be issued an access card on your first day. This card grants you entry to areas relevant to your role. You must:</p>
<ul>
  <li>Carry your access card at all times while on site.</li>
  <li>Never share or lend your card to anyone else.</li>
  <li>Report a lost or stolen card to security immediately.</li>
  <li>Swipe in and out of each secured zone.</li>
</ul>

<h3>Visitor Management</h3>
<p>All visitors must sign in at the main reception and be accompanied by an authorised employee at all times. Visitors must wear a visitor badge and be briefed on basic safety requirements before entering operational areas.</p>

<h3>CCTV & Monitoring</h3>
<p>CCTV cameras operate throughout the facility 24/7. Footage may be reviewed for safety investigations, security incidents, or operational purposes.</p>

<h3>Personal Property</h3>
<p>Secure your personal belongings in the designated locker areas. The company is not responsible for lost or stolen personal items. Do not leave valuables unattended on the warehouse floor.</p>`
  },
  {
    title: 'Induction Assessment',
    duration: '6:00',
    order_index: 6,
    has_quiz: 1,
    content: `<h2>Induction Assessment</h2>
<p>Congratulations on completing the Induction Training module! Before you can be cleared to work on-site, you must pass this short assessment with a score of at least <strong>70%</strong>.</p>
<p>Read each question carefully and select the best answer. You can retake the assessment if you do not pass on the first attempt.</p>
<p>Good luck!</p>`
  }
];

const insertLesson = db.prepare(`
  INSERT INTO lessons (course_id, title, content, duration, order_index, has_quiz)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const inductionLessonIds = {};
inductionLessons.forEach(l => {
  const id = insertLesson.run(inductionId, l.title, l.content, l.duration, l.order_index, l.has_quiz).lastInsertRowid;
  inductionLessonIds[l.order_index] = id;
});

// Toolbox Lessons
const toolboxLessons = [
  {
    title: 'Personal Protective Equipment (PPE)',
    duration: '4:20',
    order_index: 1,
    has_quiz: 0,
    content: `<h2>Personal Protective Equipment (PPE)</h2>
<p>PPE is your last line of defence against workplace injury. Wearing the right PPE in the right areas is mandatory, not optional.</p>

<h3>Mandatory PPE on the Warehouse Floor</h3>
<ul>
  <li><strong>Safety boots</strong> (steel-capped, AS/NZS 2210 compliant) — required in all operational areas.</li>
  <li><strong>High-visibility vest</strong> — must be worn at all times in the warehouse.</li>
  <li><strong>Hard hat</strong> — required in loading dock and racking areas.</li>
  <li><strong>Safety glasses</strong> — required when handling sharp or particulate materials.</li>
  <li><strong>Gloves</strong> — required when handling rough, sharp, or chemical materials.</li>
</ul>

<h3>PPE Care & Maintenance</h3>
<p>Inspect your PPE before each shift. Damaged or worn PPE must be replaced immediately — do not use damaged equipment. Report any PPE defects to your supervisor and request a replacement from the stores area.</p>

<h3>Fit-for-Purpose</h3>
<p>Ensure PPE fits correctly. Loose-fitting gloves can get caught in machinery. Ill-fitting helmets offer reduced protection. If your PPE does not fit, request a different size.</p>

<h3>Area-Specific Requirements</h3>
<table style="border-collapse:collapse;width:100%">
  <tr><th style="border:1px solid #374151;padding:8px;background:#1F2937">Area</th><th style="border:1px solid #374151;padding:8px;background:#1F2937">Required PPE</th></tr>
  <tr><td style="border:1px solid #374151;padding:8px">All Zones</td><td style="border:1px solid #374151;padding:8px">Hi-vis vest, Safety boots</td></tr>
  <tr><td style="border:1px solid #374151;padding:8px">Racking Areas</td><td style="border:1px solid #374151;padding:8px">+ Hard hat</td></tr>
  <tr><td style="border:1px solid #374151;padding:8px">Chemical Store</td><td style="border:1px solid #374151;padding:8px">+ Gloves, Safety glasses, Face shield</td></tr>
  <tr><td style="border:1px solid #374151;padding:8px">Loading Dock</td><td style="border:1px solid #374151;padding:8px">+ Hard hat, Gloves</td></tr>
</table>`
  },
  {
    title: 'Forklift & MHE Safety',
    duration: '5:50',
    order_index: 2,
    has_quiz: 0,
    content: `<h2>Forklift & Material Handling Equipment (MHE) Safety</h2>
<p>Forklifts are one of the most common causes of serious injury in warehouse environments. Everyone on site — operators and pedestrians alike — must understand forklift safety rules.</p>

<h3>For Operators Only</h3>
<p>You must hold a valid <strong>LF licence</strong> (Licence to Operate a Forklift) to operate any forklift on our site. No exceptions.</p>

<h3>Pre-Operation Check (DAMP)</h3>
<p>Before every shift, complete a DAMP inspection:</p>
<ul>
  <li><strong>D</strong> — Documentation (licence, pre-start checklist)</li>
  <li><strong>A</strong> — Around the vehicle (visual inspection, tyres, leaks)</li>
  <li><strong>M</strong> — Mast, forks, hydraulics, seatbelt</li>
  <li><strong>P</strong> — Power source (fuel level, battery charge, LPG cylinder)</li>
</ul>
<p>Any faults found during the pre-start check must be reported immediately. Do not operate a faulty forklift.</p>

<h3>Safe Operating Rules</h3>
<ul>
  <li>Maximum speed: <strong>10 km/h</strong> in the warehouse, <strong>5 km/h</strong> in pedestrian zones.</li>
  <li>Always travel with the forks <strong>lowered</strong> (150–200mm off the ground).</li>
  <li>Sound the horn at all blind corners and intersections.</li>
  <li>Never carry unauthorised passengers.</li>
  <li>Never exceed the rated load capacity shown on the data plate.</li>
  <li>Park safely in designated areas with forks lowered and power off.</li>
</ul>

<h3>Pedestrian Rules</h3>
<ul>
  <li>Always use designated pedestrian walkways (yellow-lined).</li>
  <li>Make eye contact with forklift operators before crossing their path.</li>
  <li>Never walk behind a reversing forklift.</li>
  <li>Give way to forklifts in shared zones.</li>
</ul>`
  },
  {
    title: 'Racking & Storage Systems',
    duration: '3:55',
    order_index: 3,
    has_quiz: 0,
    content: `<h2>Racking & Storage Systems</h2>
<p>Racking failures can cause catastrophic injuries. Understanding proper racking use and load limits is critical for everyone working in storage areas.</p>

<h3>Load Limits</h3>
<p>Every racking bay has a <strong>maximum load limit</strong> posted on a label. Never exceed this limit. Overloading a rack can cause collapse, endangering everyone in the area.</p>

<h3>Racking Inspection</h3>
<p>Inspect racking at the start of each shift for:</p>
<ul>
  <li>Bent or damaged uprights</li>
  <li>Missing or damaged beam locks</li>
  <li>Dislodged safety pins</li>
  <li>Unevenly distributed loads</li>
</ul>
<p>If you identify damaged racking, <strong>do not use it</strong>. Tag it with a "Do Not Use" tag and report it immediately to your supervisor.</p>

<h3>Proper Loading Techniques</h3>
<ul>
  <li>Place heavier items on lower shelves.</li>
  <li>Distribute weight evenly across the bay.</li>
  <li>Ensure loads are stable before releasing.</li>
  <li>Never store items directly on the floor blocking emergency exits or fire equipment.</li>
  <li>Ensure pallet overhangs do not exceed 50mm on either side.</li>
</ul>

<h3>Damaged Goods</h3>
<p>Segregate damaged goods in the designated damaged stock area. Never store damaged goods with saleable stock. Complete a damage report and notify your supervisor.</p>`
  },
  {
    title: 'Hazardous Materials Handling',
    duration: '4:40',
    order_index: 4,
    has_quiz: 0,
    content: `<h2>Hazardous Materials Handling</h2>
<p>Some goods stored or handled in our warehouse are classified as hazardous. Proper handling of these materials protects you, your colleagues, and the environment.</p>

<h3>Safety Data Sheets (SDS)</h3>
<p>Every hazardous substance must have an SDS (Safety Data Sheet) available at the point of use. The SDS contains information on:</p>
<ul>
  <li>Chemical properties and hazards</li>
  <li>Safe handling and storage requirements</li>
  <li>Required PPE</li>
  <li>First aid measures</li>
  <li>Spill response procedures</li>
  <li>Disposal requirements</li>
</ul>
<p>SDS documents are stored in the red binder at the chemical storage area and are also available digitally on the company intranet.</p>

<h3>GHS Hazard Labels</h3>
<p>All hazardous materials are labelled using the Globally Harmonised System (GHS). Familiarise yourself with the 9 GHS pictograms and their meanings before handling chemicals.</p>

<h3>Storage Requirements</h3>
<ul>
  <li>Store chemicals in the designated chemical store only.</li>
  <li>Flammable materials must be stored in flammable cabinets, away from ignition sources.</li>
  <li>Do not store incompatible chemicals together (e.g., acids and bases).</li>
  <li>Keep containers tightly sealed when not in use.</li>
</ul>

<h3>Spill Response</h3>
<ol>
  <li>Evacuate the immediate area.</li>
  <li>Alert your supervisor and the safety officer.</li>
  <li>Do not attempt to clean up chemical spills without proper training and PPE.</li>
  <li>Refer to the SDS for specific spill response procedures.</li>
</ol>`
  },
  {
    title: 'Loading Dock Operations',
    duration: '4:15',
    order_index: 5,
    has_quiz: 0,
    content: `<h2>Loading Dock Operations</h2>
<p>The loading dock is one of the highest-risk areas in any warehouse. Strict procedures must be followed at all times.</p>

<h3>Before a Vehicle Arrives</h3>
<ul>
  <li>Ensure the dock is clear of obstructions and personnel not involved in the unload/load.</li>
  <li>Confirm the correct dock door is assigned to the vehicle.</li>
  <li>Prepare the dock leveller and wheel chocks.</li>
</ul>

<h3>Vehicle Docking Procedure</h3>
<ol>
  <li>Direct the driver to reverse slowly into the dock using a spotter.</li>
  <li>Apply <strong>wheel chocks</strong> to the rear wheels before the driver exits the cab.</li>
  <li>Engage the <strong>dock lock</strong> (vehicle restraint system) if fitted.</li>
  <li>Confirm the vehicle is secure before opening the dock door.</li>
  <li>Deploy the <strong>dock leveller</strong> to bridge the gap between dock and trailer.</li>
</ol>

<h3>During Loading/Unloading</h3>
<ul>
  <li>Maintain a clear communication channel with the forklift operator.</li>
  <li>Do not allow unauthorised personnel in the dock area.</li>
  <li>Check trailer floor integrity before driving a forklift inside.</li>
  <li>Never drive a forklift onto an unsecured trailer.</li>
</ul>

<h3>After Operations</h3>
<ol>
  <li>Raise the dock leveller and close the dock door.</li>
  <li>Remove wheel chocks only after the door is closed.</li>
  <li>Give the all-clear signal to the driver.</li>
  <li>Complete all relevant documentation (inbound/outbound manifests).</li>
</ol>`
  },
  {
    title: 'First Aid & Incident Reporting',
    duration: '3:50',
    order_index: 6,
    has_quiz: 0,
    content: `<h2>First Aid & Incident Reporting</h2>
<p>Quick, appropriate response to injuries and incidents can reduce harm and protect your legal rights.</p>

<h3>First Aid Kit Locations</h3>
<ul>
  <li>Receiving Bay — Column A12</li>
  <li>Main Warehouse — Column C8</li>
  <li>Loading Dock — Near Dock Door 3</li>
  <li>Break Room — Main wall</li>
  <li>Supervisor's Office — Desk shelf</li>
</ul>

<h3>First Aid Officers On Site</h3>
<p>At least one qualified First Aid Officer is on duty during every shift. Their names are posted on the notice board in the break room. First Aid Officers wear a green cross on their hi-vis vest.</p>

<h3>Reporting an Incident</h3>
<p>All incidents — including near-misses — must be reported. Even if no injury occurred, a near-miss is a warning that something dangerous nearly happened.</p>
<ol>
  <li>Ensure the injured person receives appropriate care first.</li>
  <li>Secure the scene to prevent further injury.</li>
  <li>Notify your supervisor immediately.</li>
  <li>Complete an <strong>Incident Report Form</strong> within 24 hours.</li>
  <li>Cooperate fully with any investigation.</li>
</ol>

<h3>What to Include in an Incident Report</h3>
<ul>
  <li>Date, time, and location of the incident</li>
  <li>Names of people involved and witnesses</li>
  <li>Description of what happened (factual, not opinion)</li>
  <li>Injuries sustained and treatment provided</li>
  <li>Equipment or conditions involved</li>
  <li>Immediate corrective actions taken</li>
</ul>`
  },
  {
    title: 'Toolbox Training Assessment',
    duration: '6:00',
    order_index: 7,
    has_quiz: 1,
    content: `<h2>Toolbox Training Assessment</h2>
<p>You've completed all Toolbox Training lessons. This assessment tests your knowledge of warehouse safety procedures covered in this module.</p>
<p>You need to score at least <strong>70%</strong> to pass. Take your time and read each question carefully.</p>
<p>You may retake this assessment if needed.</p>`
  }
];

const toolboxLessonIds = {};
toolboxLessons.forEach(l => {
  const id = insertLesson.run(toolboxId, l.title, l.content, l.duration, l.order_index, l.has_quiz).lastInsertRowid;
  toolboxLessonIds[l.order_index] = id;
});

// Induction Quiz Questions (lesson index 6)
const inductionQuizId = inductionLessonIds[6];
const insertQuestion = db.prepare(`INSERT INTO quiz_questions (lesson_id, question, order_index) VALUES (?, ?, ?)`);
const insertOption = db.prepare(`INSERT INTO quiz_options (question_id, option_text, is_correct) VALUES (?, ?, ?)`);

const inductionQuiz = [
  {
    question: 'What should you do immediately when you discover a fire in the warehouse?',
    options: [
      { text: 'Activate the nearest fire alarm and evacuate immediately', correct: true },
      { text: 'Try to extinguish the fire yourself first', correct: false },
      { text: 'Wait to see if the fire grows larger before raising the alarm', correct: false },
      { text: 'Collect your personal belongings then exit the building', correct: false }
    ]
  },
  {
    question: 'What is the maximum recommended weight for a single manual lift (for men) without mechanical assistance?',
    options: [
      { text: '25 kg', correct: true },
      { text: '10 kg', correct: false },
      { text: '40 kg', correct: false },
      { text: '50 kg', correct: false }
    ]
  },
  {
    question: 'If you notice a safety hazard that is not an immediate emergency, what is the correct action?',
    options: [
      { text: 'Report it to your supervisor and complete a hazard report form', correct: true },
      { text: 'Ignore it if it does not affect your current task', correct: false },
      { text: 'Fix it yourself without telling anyone', correct: false },
      { text: 'Wait until the end of your shift to mention it', correct: false }
    ]
  },
  {
    question: 'Which of the following behaviours violates our workplace conduct policy?',
    options: [
      { text: 'Using a mobile phone to make personal calls on the warehouse floor', correct: true },
      { text: 'Reporting a near-miss to your supervisor', correct: false },
      { text: 'Wearing your access card visibly at all times', correct: false },
      { text: 'Using the correct manual handling technique', correct: false }
    ]
  },
  {
    question: 'During a fire emergency, which route should you use to evacuate?',
    options: [
      { text: 'The nearest clearly marked emergency exit, using stairs', correct: true },
      { text: 'The lift/elevator as it is the fastest route', correct: false },
      { text: 'The main entrance only, regardless of distance', correct: false },
      { text: 'Any unlocked door you can find', correct: false }
    ]
  }
];

inductionQuiz.forEach((q, qi) => {
  const questionId = insertQuestion.run(inductionQuizId, q.question, qi + 1).lastInsertRowid;
  q.options.forEach(o => insertOption.run(questionId, o.text, o.correct ? 1 : 0));
});

// Toolbox Quiz Questions (lesson index 7)
const toolboxQuizId = toolboxLessonIds[7];

const toolboxQuiz = [
  {
    question: 'What does DAMP stand for in a forklift pre-operation check?',
    options: [
      { text: 'Documentation, Around, Mast, Power', correct: true },
      { text: 'Drive, Adjust, Monitor, Park', correct: false },
      { text: 'Detect, Assess, Manage, Proceed', correct: false },
      { text: 'Daily, Around, Maintain, Power', correct: false }
    ]
  },
  {
    question: 'What must be done BEFORE opening a loading dock door to receive a vehicle?',
    options: [
      { text: 'Apply wheel chocks to the vehicle and confirm it is secured', correct: true },
      { text: 'Call the transport company to confirm delivery', correct: false },
      { text: 'Ensure the forklift battery is fully charged', correct: false },
      { text: 'Nothing — just open the door when the truck arrives', correct: false }
    ]
  },
  {
    question: 'What PPE is mandatory in ALL operational zones of the warehouse?',
    options: [
      { text: 'High-visibility vest and safety boots', correct: true },
      { text: 'Hard hat and gloves only', correct: false },
      { text: 'Safety glasses and face shield', correct: false },
      { text: 'Ear protection and knee pads', correct: false }
    ]
  },
  {
    question: 'Where would you find the correct procedures for responding to a chemical spill?',
    options: [
      { text: 'The Safety Data Sheet (SDS) for that chemical', correct: true },
      { text: 'The warehouse operations manual', correct: false },
      { text: 'Ask a colleague who has dealt with spills before', correct: false },
      { text: 'Search online for the chemical name', correct: false }
    ]
  },
  {
    question: 'What is the maximum speed for a forklift operating in a pedestrian zone?',
    options: [
      { text: '5 km/h', correct: true },
      { text: '10 km/h', correct: false },
      { text: '15 km/h', correct: false },
      { text: '20 km/h', correct: false }
    ]
  },
  {
    question: 'What should you do if you identify a near-miss incident (no injury occurred)?',
    options: [
      { text: 'Report it to your supervisor and complete an incident report form', correct: true },
      { text: 'Ignore it since nobody was hurt', correct: false },
      { text: 'Only report it if it happens again', correct: false },
      { text: 'Tell a colleague but not a supervisor', correct: false }
    ]
  }
];

toolboxQuiz.forEach((q, qi) => {
  const questionId = insertQuestion.run(toolboxQuizId, q.question, qi + 1).lastInsertRowid;
  q.options.forEach(o => insertOption.run(questionId, o.text, o.correct ? 1 : 0));
});

console.log('✅ Database seeded successfully!');
console.log('');
console.log('Admin login:  admin@warehouse.com / admin123');
console.log('User login:   john.smith@warehouse.com / user123');
