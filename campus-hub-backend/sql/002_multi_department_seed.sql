-- Campus Hub: multi-department demo data (generated)
-- 5 departments (CSE, ECE, EEE, IT, MECH) x 2 students + 2 faculty = 10 students, 10 faculty.
-- Each department has a II year and a III year class division, each with its own weekly timetable.
-- Password for every account: demo123      Login email = <id>@campus.hub  (e.g. s101@campus.hub)
--
-- WARNING: section 1 DELETES the old demo accounts and everything linked to them (students, faculty,
-- schedule, tasks, broadcasts, notifications, read_status, schedule_requests). It does NOT touch
-- institutional_updates, update_sources or ingest_runs, so your Gmail-ingested updates stay.
-- Run after the base schema and sql/001_updates_backend.sql. Safe to run again.

-- 0) schema additions (idempotent)
alter table schedule add column if not exists dept text,
                     add column if not exists year int,
                     add column if not exists weekday int,                  -- 1 = Monday ... 5 = Friday
                     add column if not exists kind text not null default 'theory';  -- theory | lab | mentoring
alter table tasks add column if not exists dept text, add column if not exists year int;
alter table students add column if not exists year int;

-- 1) reset demo data
truncate users restart identity cascade;
delete from auth.users where email like '%@campus.hub';

-- 2) login accounts
insert into auth.users
 (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,recovery_token,email_change,email_change_token_new)
select '00000000-0000-0000-0000-000000000000',v.id::uuid,'authenticated','authenticated',
  lower(v.login)||'@campus.hub',crypt('demo123',gen_salt('bf')),now(),
  '{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''
from (values
  ('f0000000-0000-0000-0000-000000000201','F201'),
  ('f0000000-0000-0000-0000-000000000202','F202'),
  ('f0000000-0000-0000-0000-000000000203','F203'),
  ('f0000000-0000-0000-0000-000000000204','F204'),
  ('f0000000-0000-0000-0000-000000000205','F205'),
  ('f0000000-0000-0000-0000-000000000206','F206'),
  ('f0000000-0000-0000-0000-000000000207','F207'),
  ('f0000000-0000-0000-0000-000000000208','F208'),
  ('f0000000-0000-0000-0000-000000000209','F209'),
  ('f0000000-0000-0000-0000-000000000210','F210'),
  ('50000000-0000-0000-0000-000000000101','S101'),
  ('50000000-0000-0000-0000-000000000102','S102'),
  ('50000000-0000-0000-0000-000000000103','S103'),
  ('50000000-0000-0000-0000-000000000104','S104'),
  ('50000000-0000-0000-0000-000000000105','S105'),
  ('50000000-0000-0000-0000-000000000106','S106'),
  ('50000000-0000-0000-0000-000000000107','S107'),
  ('50000000-0000-0000-0000-000000000108','S108'),
  ('50000000-0000-0000-0000-000000000109','S109'),
  ('50000000-0000-0000-0000-000000000110','S110')
) as v(id,login);

insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
select gen_random_uuid(),u.id::text,u.id,
  jsonb_build_object('sub',u.id::text,'email',u.email,'email_verified',true),
  'email',now(),now(),now()
from auth.users u where u.email like '%@campus.hub';

-- 3) profiles
insert into users(id,login_id,role,name) values
  ('f0000000-0000-0000-0000-000000000201','F201','faculty','Dr. Meera Iyer'),
  ('f0000000-0000-0000-0000-000000000202','F202','faculty','Prof. R. Kumar'),
  ('f0000000-0000-0000-0000-000000000203','F203','faculty','Dr. S. Nair'),
  ('f0000000-0000-0000-0000-000000000204','F204','faculty','Prof. Anjali Deshmukh'),
  ('f0000000-0000-0000-0000-000000000205','F205','faculty','Dr. Vikram Singh'),
  ('f0000000-0000-0000-0000-000000000206','F206','faculty','Prof. Lakshmi Narayanan'),
  ('f0000000-0000-0000-0000-000000000207','F207','faculty','Dr. Farah Khan'),
  ('f0000000-0000-0000-0000-000000000208','F208','faculty','Prof. T. Suresh'),
  ('f0000000-0000-0000-0000-000000000209','F209','faculty','Dr. Rajesh Gupta'),
  ('f0000000-0000-0000-0000-000000000210','F210','faculty','Prof. Deepa Menon'),
  ('50000000-0000-0000-0000-000000000101','S101','student','Aarav Menon'),
  ('50000000-0000-0000-0000-000000000102','S102','student','Ishita Rao'),
  ('50000000-0000-0000-0000-000000000103','S103','student','Karan Patel'),
  ('50000000-0000-0000-0000-000000000104','S104','student','Sneha Reddy'),
  ('50000000-0000-0000-0000-000000000105','S105','student','Dev Anand'),
  ('50000000-0000-0000-0000-000000000106','S106','student','Nisha Thomas'),
  ('50000000-0000-0000-0000-000000000107','S107','student','Riya Sharma'),
  ('50000000-0000-0000-0000-000000000108','S108','student','Arjun Krishnan'),
  ('50000000-0000-0000-0000-000000000109','S109','student','Mohammed Faiz'),
  ('50000000-0000-0000-0000-000000000110','S110','student','Pooja Venkatesh');

insert into faculty(user_id,dept) values
  ('f0000000-0000-0000-0000-000000000201','CSE'),
  ('f0000000-0000-0000-0000-000000000202','CSE'),
  ('f0000000-0000-0000-0000-000000000203','ECE'),
  ('f0000000-0000-0000-0000-000000000204','ECE'),
  ('f0000000-0000-0000-0000-000000000205','EEE'),
  ('f0000000-0000-0000-0000-000000000206','EEE'),
  ('f0000000-0000-0000-0000-000000000207','IT'),
  ('f0000000-0000-0000-0000-000000000208','IT'),
  ('f0000000-0000-0000-0000-000000000209','MECH'),
  ('f0000000-0000-0000-0000-000000000210','MECH');

insert into students(user_id,dept,section,year,attendance,cgpa,internals) values
  ('50000000-0000-0000-0000-000000000101','CSE','A',2,86,8.4,'{"Database Systems": 45, "Data Structures": 38, "Digital Logic": 39, "Discrete Mathematics": 48, "Object Oriented Programming": 46}'),
  ('50000000-0000-0000-0000-000000000102','CSE','A',3,78,7.9,'{"Operating Systems": 34, "Computer Networks": 38, "Compiler Design": 35, "Software Engineering": 46, "Web Technology": 44}'),
  ('50000000-0000-0000-0000-000000000103','ECE','A',2,91,8.8,'{"Electronic Circuits": 39, "Signals and Systems": 49, "Network Theory": 49, "Digital Electronics": 49, "Electromagnetic Fields": 41}'),
  ('50000000-0000-0000-0000-000000000104','ECE','A',3,69,6.8,'{"Digital Signal Processing": 37, "Analog Communication": 34, "Microprocessors": 33, "Control Systems": 40, "VLSI Design": 35}'),
  ('50000000-0000-0000-0000-000000000105','EEE','A',2,83,8.1,'{"Electrical Machines I": 44, "Circuit Analysis": 42, "Electromagnetic Theory": 42, "Analog Electronics": 42, "Measurements and Instrumentation": 41}'),
  ('50000000-0000-0000-0000-000000000106','EEE','A',3,74,7.2,'{"Power Systems I": 37, "Electrical Machines II": 43, "Power Electronics": 41, "Microcontrollers": 34, "Protection and Switchgear": 39}'),
  ('50000000-0000-0000-0000-000000000107','IT','A',2,95,9.2,'{"Algorithms": 40, "Relational Databases": 49, "Computer Organization": 47, "Probability and Statistics": 46, "Java Programming": 49}'),
  ('50000000-0000-0000-0000-000000000108','IT','A',3,66,6.3,'{"Information Security": 28, "Cloud Computing": 31, "Data Mining": 25, "Web Services": 37, "Mobile Application Development": 26}'),
  ('50000000-0000-0000-0000-000000000109','MECH','A',2,88,8.6,'{"Thermodynamics": 45, "Fluid Mechanics": 49, "Strength of Materials": 44, "Manufacturing Processes": 42, "Kinematics of Machinery": 40}'),
  ('50000000-0000-0000-0000-000000000110','MECH','A',3,72,7.0,'{"Design of Machine Elements": 38, "Heat and Mass Transfer": 36, "Dynamics of Machinery": 35, "Metrology": 39, "CAD/CAM": 37}');

-- 4) weekly timetables: 10 divisions x 18 rows (15 theory periods, 2 lab blocks, 1 mentor hour; the rest are free periods)
insert into schedule(dept,year,section,weekday,start_t,end_t,subject,room,faculty_id,kind,status) values
  ('CSE',2,'CSE-A',1,'13:30','15:20','DS Lab','Lab-CS1','f0000000-0000-0000-0000-000000000202','lab','normal'),
  ('CSE',2,'CSE-A',3,'13:30','15:20','DS Lab','Lab-CS1','f0000000-0000-0000-0000-000000000202','lab','normal'),
  ('CSE',2,'CSE-A',5,'14:30','15:20','Mentor Hour','LH-201','f0000000-0000-0000-0000-000000000201','mentoring','normal'),
  ('CSE',2,'CSE-A',1,'09:00','09:50','Discrete Mathematics','LH-201','f0000000-0000-0000-0000-000000000202','theory','normal'),
  ('CSE',2,'CSE-A',1,'11:15','12:05','Discrete Mathematics','LH-201','f0000000-0000-0000-0000-000000000202','theory','normal'),
  ('CSE',2,'CSE-A',2,'09:00','09:50','Database Systems','LH-201','f0000000-0000-0000-0000-000000000201','theory','normal'),
  ('CSE',2,'CSE-A',2,'13:30','14:20','Object Oriented Programming','LH-201','f0000000-0000-0000-0000-000000000201','theory','normal'),
  ('CSE',2,'CSE-A',2,'14:30','15:20','Data Structures','LH-201','f0000000-0000-0000-0000-000000000202','theory','normal'),
  ('CSE',2,'CSE-A',3,'09:00','09:50','Database Systems','LH-201','f0000000-0000-0000-0000-000000000201','theory','normal'),
  ('CSE',2,'CSE-A',3,'10:00','10:50','Data Structures','LH-201','f0000000-0000-0000-0000-000000000202','theory','normal'),
  ('CSE',2,'CSE-A',3,'11:15','12:05','Digital Logic','LH-201','f0000000-0000-0000-0000-000000000201','theory','normal'),
  ('CSE',2,'CSE-A',4,'09:00','09:50','Digital Logic','LH-201','f0000000-0000-0000-0000-000000000201','theory','normal'),
  ('CSE',2,'CSE-A',4,'10:00','10:50','Database Systems','LH-201','f0000000-0000-0000-0000-000000000201','theory','normal'),
  ('CSE',2,'CSE-A',4,'11:15','12:05','Data Structures','LH-201','f0000000-0000-0000-0000-000000000202','theory','normal'),
  ('CSE',2,'CSE-A',5,'09:00','09:50','Object Oriented Programming','LH-201','f0000000-0000-0000-0000-000000000201','theory','normal'),
  ('CSE',2,'CSE-A',5,'10:00','10:50','Digital Logic','LH-201','f0000000-0000-0000-0000-000000000201','theory','normal'),
  ('CSE',2,'CSE-A',5,'11:15','12:05','Object Oriented Programming','LH-201','f0000000-0000-0000-0000-000000000201','theory','normal'),
  ('CSE',2,'CSE-A',5,'13:30','14:20','Discrete Mathematics','LH-201','f0000000-0000-0000-0000-000000000202','theory','normal'),
  ('CSE',3,'CSE-A',1,'13:30','15:20','Networks Lab','Lab-CS2','f0000000-0000-0000-0000-000000000201','lab','normal'),
  ('CSE',3,'CSE-A',4,'13:30','15:20','Networks Lab','Lab-CS2','f0000000-0000-0000-0000-000000000201','lab','normal'),
  ('CSE',3,'CSE-A',5,'14:30','15:20','Mentor Hour','LH-301','f0000000-0000-0000-0000-000000000202','mentoring','normal'),
  ('CSE',3,'CSE-A',1,'09:00','09:50','Computer Networks','LH-301','f0000000-0000-0000-0000-000000000201','theory','normal'),
  ('CSE',3,'CSE-A',2,'09:00','09:50','Web Technology','LH-301','f0000000-0000-0000-0000-000000000202','theory','normal'),
  ('CSE',3,'CSE-A',2,'10:00','10:50','Operating Systems','LH-301','f0000000-0000-0000-0000-000000000202','theory','normal'),
  ('CSE',3,'CSE-A',2,'14:30','15:20','Computer Networks','LH-301','f0000000-0000-0000-0000-000000000201','theory','normal'),
  ('CSE',3,'CSE-A',3,'09:00','09:50','Operating Systems','LH-301','f0000000-0000-0000-0000-000000000202','theory','normal'),
  ('CSE',3,'CSE-A',3,'10:00','10:50','Software Engineering','LH-301','f0000000-0000-0000-0000-000000000201','theory','normal'),
  ('CSE',3,'CSE-A',3,'11:15','12:05','Compiler Design','LH-301','f0000000-0000-0000-0000-000000000202','theory','normal'),
  ('CSE',3,'CSE-A',3,'13:30','14:20','Software Engineering','LH-301','f0000000-0000-0000-0000-000000000201','theory','normal'),
  ('CSE',3,'CSE-A',4,'09:00','09:50','Web Technology','LH-301','f0000000-0000-0000-0000-000000000202','theory','normal'),
  ('CSE',3,'CSE-A',4,'10:00','10:50','Compiler Design','LH-301','f0000000-0000-0000-0000-000000000202','theory','normal'),
  ('CSE',3,'CSE-A',4,'11:15','12:05','Computer Networks','LH-301','f0000000-0000-0000-0000-000000000201','theory','normal'),
  ('CSE',3,'CSE-A',5,'09:00','09:50','Operating Systems','LH-301','f0000000-0000-0000-0000-000000000202','theory','normal'),
  ('CSE',3,'CSE-A',5,'10:00','10:50','Web Technology','LH-301','f0000000-0000-0000-0000-000000000202','theory','normal'),
  ('CSE',3,'CSE-A',5,'11:15','12:05','Compiler Design','LH-301','f0000000-0000-0000-0000-000000000202','theory','normal'),
  ('CSE',3,'CSE-A',5,'13:30','14:20','Software Engineering','LH-301','f0000000-0000-0000-0000-000000000201','theory','normal'),
  ('ECE',2,'ECE-A',1,'13:30','15:20','Circuits Lab','Lab-EC1','f0000000-0000-0000-0000-000000000204','lab','normal'),
  ('ECE',2,'ECE-A',4,'13:30','15:20','Circuits Lab','Lab-EC1','f0000000-0000-0000-0000-000000000204','lab','normal'),
  ('ECE',2,'ECE-A',5,'14:30','15:20','Mentor Hour','LH-203','f0000000-0000-0000-0000-000000000203','mentoring','normal'),
  ('ECE',2,'ECE-A',1,'09:00','09:50','Electromagnetic Fields','LH-203','f0000000-0000-0000-0000-000000000203','theory','normal'),
  ('ECE',2,'ECE-A',1,'10:00','10:50','Signals and Systems','LH-203','f0000000-0000-0000-0000-000000000204','theory','normal'),
  ('ECE',2,'ECE-A',1,'11:15','12:05','Signals and Systems','LH-203','f0000000-0000-0000-0000-000000000204','theory','normal'),
  ('ECE',2,'ECE-A',2,'09:00','09:50','Electromagnetic Fields','LH-203','f0000000-0000-0000-0000-000000000203','theory','normal'),
  ('ECE',2,'ECE-A',2,'11:15','12:05','Network Theory','LH-203','f0000000-0000-0000-0000-000000000203','theory','normal'),
  ('ECE',2,'ECE-A',2,'13:30','14:20','Electronic Circuits','LH-203','f0000000-0000-0000-0000-000000000203','theory','normal'),
  ('ECE',2,'ECE-A',3,'09:00','09:50','Electromagnetic Fields','LH-203','f0000000-0000-0000-0000-000000000203','theory','normal'),
  ('ECE',2,'ECE-A',3,'10:00','10:50','Network Theory','LH-203','f0000000-0000-0000-0000-000000000203','theory','normal'),
  ('ECE',2,'ECE-A',3,'11:15','12:05','Electronic Circuits','LH-203','f0000000-0000-0000-0000-000000000203','theory','normal'),
  ('ECE',2,'ECE-A',3,'13:30','14:20','Digital Electronics','LH-203','f0000000-0000-0000-0000-000000000204','theory','normal'),
  ('ECE',2,'ECE-A',3,'14:30','15:20','Digital Electronics','LH-203','f0000000-0000-0000-0000-000000000204','theory','normal'),
  ('ECE',2,'ECE-A',4,'10:00','10:50','Digital Electronics','LH-203','f0000000-0000-0000-0000-000000000204','theory','normal'),
  ('ECE',2,'ECE-A',4,'11:15','12:05','Electronic Circuits','LH-203','f0000000-0000-0000-0000-000000000203','theory','normal'),
  ('ECE',2,'ECE-A',5,'10:00','10:50','Network Theory','LH-203','f0000000-0000-0000-0000-000000000203','theory','normal'),
  ('ECE',2,'ECE-A',5,'11:15','12:05','Signals and Systems','LH-203','f0000000-0000-0000-0000-000000000204','theory','normal'),
  ('ECE',3,'ECE-A',3,'13:30','15:20','DSP Lab','Lab-EC2','f0000000-0000-0000-0000-000000000203','lab','normal'),
  ('ECE',3,'ECE-A',4,'13:30','15:20','DSP Lab','Lab-EC2','f0000000-0000-0000-0000-000000000203','lab','normal'),
  ('ECE',3,'ECE-A',5,'14:30','15:20','Mentor Hour','LH-303','f0000000-0000-0000-0000-000000000204','mentoring','normal'),
  ('ECE',3,'ECE-A',1,'09:00','09:50','Microprocessors','LH-303','f0000000-0000-0000-0000-000000000204','theory','normal'),
  ('ECE',3,'ECE-A',1,'11:15','12:05','Analog Communication','LH-303','f0000000-0000-0000-0000-000000000203','theory','normal'),
  ('ECE',3,'ECE-A',1,'13:30','14:20','Control Systems','LH-303','f0000000-0000-0000-0000-000000000203','theory','normal'),
  ('ECE',3,'ECE-A',2,'09:00','09:50','Digital Signal Processing','LH-303','f0000000-0000-0000-0000-000000000204','theory','normal'),
  ('ECE',3,'ECE-A',2,'10:00','10:50','Control Systems','LH-303','f0000000-0000-0000-0000-000000000203','theory','normal'),
  ('ECE',3,'ECE-A',2,'11:15','12:05','Digital Signal Processing','LH-303','f0000000-0000-0000-0000-000000000204','theory','normal'),
  ('ECE',3,'ECE-A',2,'14:30','15:20','VLSI Design','LH-303','f0000000-0000-0000-0000-000000000204','theory','normal'),
  ('ECE',3,'ECE-A',3,'09:00','09:50','Digital Signal Processing','LH-303','f0000000-0000-0000-0000-000000000204','theory','normal'),
  ('ECE',3,'ECE-A',3,'10:00','10:50','Microprocessors','LH-303','f0000000-0000-0000-0000-000000000204','theory','normal'),
  ('ECE',3,'ECE-A',4,'09:00','09:50','Control Systems','LH-303','f0000000-0000-0000-0000-000000000203','theory','normal'),
  ('ECE',3,'ECE-A',4,'10:00','10:50','Analog Communication','LH-303','f0000000-0000-0000-0000-000000000203','theory','normal'),
  ('ECE',3,'ECE-A',4,'11:15','12:05','VLSI Design','LH-303','f0000000-0000-0000-0000-000000000204','theory','normal'),
  ('ECE',3,'ECE-A',5,'09:00','09:50','Analog Communication','LH-303','f0000000-0000-0000-0000-000000000203','theory','normal'),
  ('ECE',3,'ECE-A',5,'10:00','10:50','VLSI Design','LH-303','f0000000-0000-0000-0000-000000000204','theory','normal'),
  ('ECE',3,'ECE-A',5,'13:30','14:20','Microprocessors','LH-303','f0000000-0000-0000-0000-000000000204','theory','normal'),
  ('EEE',2,'EEE-A',1,'13:30','15:20','Machines Lab','Lab-EE1','f0000000-0000-0000-0000-000000000206','lab','normal'),
  ('EEE',2,'EEE-A',2,'13:30','15:20','Machines Lab','Lab-EE1','f0000000-0000-0000-0000-000000000206','lab','normal'),
  ('EEE',2,'EEE-A',5,'14:30','15:20','Mentor Hour','LH-205','f0000000-0000-0000-0000-000000000205','mentoring','normal'),
  ('EEE',2,'EEE-A',1,'09:00','09:50','Electromagnetic Theory','LH-205','f0000000-0000-0000-0000-000000000205','theory','normal'),
  ('EEE',2,'EEE-A',1,'10:00','10:50','Electromagnetic Theory','LH-205','f0000000-0000-0000-0000-000000000205','theory','normal'),
  ('EEE',2,'EEE-A',1,'11:15','12:05','Analog Electronics','LH-205','f0000000-0000-0000-0000-000000000206','theory','normal'),
  ('EEE',2,'EEE-A',2,'10:00','10:50','Electromagnetic Theory','LH-205','f0000000-0000-0000-0000-000000000205','theory','normal'),
  ('EEE',2,'EEE-A',2,'11:15','12:05','Electrical Machines I','LH-205','f0000000-0000-0000-0000-000000000205','theory','normal'),
  ('EEE',2,'EEE-A',3,'10:00','10:50','Circuit Analysis','LH-205','f0000000-0000-0000-0000-000000000206','theory','normal'),
  ('EEE',2,'EEE-A',3,'11:15','12:05','Analog Electronics','LH-205','f0000000-0000-0000-0000-000000000206','theory','normal'),
  ('EEE',2,'EEE-A',3,'13:30','14:20','Analog Electronics','LH-205','f0000000-0000-0000-0000-000000000206','theory','normal'),
  ('EEE',2,'EEE-A',3,'14:30','15:20','Electrical Machines I','LH-205','f0000000-0000-0000-0000-000000000205','theory','normal'),
  ('EEE',2,'EEE-A',4,'09:00','09:50','Electrical Machines I','LH-205','f0000000-0000-0000-0000-000000000205','theory','normal'),
  ('EEE',2,'EEE-A',4,'10:00','10:50','Circuit Analysis','LH-205','f0000000-0000-0000-0000-000000000206','theory','normal'),
  ('EEE',2,'EEE-A',4,'13:30','14:20','Circuit Analysis','LH-205','f0000000-0000-0000-0000-000000000206','theory','normal'),
  ('EEE',2,'EEE-A',4,'14:30','15:20','Measurements and Instrumentation','LH-205','f0000000-0000-0000-0000-000000000205','theory','normal'),
  ('EEE',2,'EEE-A',5,'11:15','12:05','Measurements and Instrumentation','LH-205','f0000000-0000-0000-0000-000000000205','theory','normal'),
  ('EEE',2,'EEE-A',5,'13:30','14:20','Measurements and Instrumentation','LH-205','f0000000-0000-0000-0000-000000000205','theory','normal'),
  ('EEE',3,'EEE-A',1,'13:30','15:20','Power Electronics Lab','Lab-EE2','f0000000-0000-0000-0000-000000000205','lab','normal'),
  ('EEE',3,'EEE-A',2,'13:30','15:20','Power Electronics Lab','Lab-EE2','f0000000-0000-0000-0000-000000000205','lab','normal'),
  ('EEE',3,'EEE-A',5,'14:30','15:20','Mentor Hour','LH-305','f0000000-0000-0000-0000-000000000206','mentoring','normal'),
  ('EEE',3,'EEE-A',1,'09:00','09:50','Protection and Switchgear','LH-305','f0000000-0000-0000-0000-000000000206','theory','normal'),
  ('EEE',3,'EEE-A',1,'10:00','10:50','Power Systems I','LH-305','f0000000-0000-0000-0000-000000000206','theory','normal'),
  ('EEE',3,'EEE-A',1,'11:15','12:05','Microcontrollers','LH-305','f0000000-0000-0000-0000-000000000205','theory','normal'),
  ('EEE',3,'EEE-A',2,'09:00','09:50','Electrical Machines II','LH-305','f0000000-0000-0000-0000-000000000205','theory','normal'),
  ('EEE',3,'EEE-A',2,'10:00','10:50','Power Electronics','LH-305','f0000000-0000-0000-0000-000000000206','theory','normal'),
  ('EEE',3,'EEE-A',2,'11:15','12:05','Protection and Switchgear','LH-305','f0000000-0000-0000-0000-000000000206','theory','normal'),
  ('EEE',3,'EEE-A',3,'09:00','09:50','Electrical Machines II','LH-305','f0000000-0000-0000-0000-000000000205','theory','normal'),
  ('EEE',3,'EEE-A',3,'10:00','10:50','Microcontrollers','LH-305','f0000000-0000-0000-0000-000000000205','theory','normal'),
  ('EEE',3,'EEE-A',3,'11:15','12:05','Microcontrollers','LH-305','f0000000-0000-0000-0000-000000000205','theory','normal'),
  ('EEE',3,'EEE-A',3,'14:30','15:20','Protection and Switchgear','LH-305','f0000000-0000-0000-0000-000000000206','theory','normal'),
  ('EEE',3,'EEE-A',4,'09:00','09:50','Power Systems I','LH-305','f0000000-0000-0000-0000-000000000206','theory','normal'),
  ('EEE',3,'EEE-A',4,'13:30','14:20','Electrical Machines II','LH-305','f0000000-0000-0000-0000-000000000205','theory','normal'),
  ('EEE',3,'EEE-A',5,'09:00','09:50','Power Electronics','LH-305','f0000000-0000-0000-0000-000000000206','theory','normal'),
  ('EEE',3,'EEE-A',5,'11:15','12:05','Power Systems I','LH-305','f0000000-0000-0000-0000-000000000206','theory','normal'),
  ('EEE',3,'EEE-A',5,'13:30','14:20','Power Electronics','LH-305','f0000000-0000-0000-0000-000000000206','theory','normal'),
  ('IT',2,'IT-A',1,'13:30','15:20','Java Lab','Lab-IT1','f0000000-0000-0000-0000-000000000208','lab','normal'),
  ('IT',2,'IT-A',3,'13:30','15:20','Java Lab','Lab-IT1','f0000000-0000-0000-0000-000000000208','lab','normal'),
  ('IT',2,'IT-A',5,'14:30','15:20','Mentor Hour','LH-207','f0000000-0000-0000-0000-000000000207','mentoring','normal'),
  ('IT',2,'IT-A',1,'11:15','12:05','Algorithms','LH-207','f0000000-0000-0000-0000-000000000207','theory','normal'),
  ('IT',2,'IT-A',2,'09:00','09:50','Java Programming','LH-207','f0000000-0000-0000-0000-000000000207','theory','normal'),
  ('IT',2,'IT-A',2,'10:00','10:50','Computer Organization','LH-207','f0000000-0000-0000-0000-000000000207','theory','normal'),
  ('IT',2,'IT-A',2,'11:15','12:05','Probability and Statistics','LH-207','f0000000-0000-0000-0000-000000000208','theory','normal'),
  ('IT',2,'IT-A',2,'13:30','14:20','Computer Organization','LH-207','f0000000-0000-0000-0000-000000000207','theory','normal'),
  ('IT',2,'IT-A',3,'09:00','09:50','Algorithms','LH-207','f0000000-0000-0000-0000-000000000207','theory','normal'),
  ('IT',2,'IT-A',3,'10:00','10:50','Java Programming','LH-207','f0000000-0000-0000-0000-000000000207','theory','normal'),
  ('IT',2,'IT-A',3,'11:15','12:05','Relational Databases','LH-207','f0000000-0000-0000-0000-000000000208','theory','normal'),
  ('IT',2,'IT-A',4,'10:00','10:50','Computer Organization','LH-207','f0000000-0000-0000-0000-000000000207','theory','normal'),
  ('IT',2,'IT-A',4,'11:15','12:05','Java Programming','LH-207','f0000000-0000-0000-0000-000000000207','theory','normal'),
  ('IT',2,'IT-A',4,'14:30','15:20','Algorithms','LH-207','f0000000-0000-0000-0000-000000000207','theory','normal'),
  ('IT',2,'IT-A',5,'09:00','09:50','Probability and Statistics','LH-207','f0000000-0000-0000-0000-000000000208','theory','normal'),
  ('IT',2,'IT-A',5,'10:00','10:50','Relational Databases','LH-207','f0000000-0000-0000-0000-000000000208','theory','normal'),
  ('IT',2,'IT-A',5,'11:15','12:05','Probability and Statistics','LH-207','f0000000-0000-0000-0000-000000000208','theory','normal'),
  ('IT',2,'IT-A',5,'13:30','14:20','Relational Databases','LH-207','f0000000-0000-0000-0000-000000000208','theory','normal'),
  ('IT',3,'IT-A',1,'13:30','15:20','Cloud Lab','Lab-IT2','f0000000-0000-0000-0000-000000000207','lab','normal'),
  ('IT',3,'IT-A',3,'13:30','15:20','Cloud Lab','Lab-IT2','f0000000-0000-0000-0000-000000000207','lab','normal'),
  ('IT',3,'IT-A',5,'14:30','15:20','Mentor Hour','LH-307','f0000000-0000-0000-0000-000000000208','mentoring','normal'),
  ('IT',3,'IT-A',1,'09:00','09:50','Information Security','LH-307','f0000000-0000-0000-0000-000000000208','theory','normal'),
  ('IT',3,'IT-A',1,'11:15','12:05','Information Security','LH-307','f0000000-0000-0000-0000-000000000208','theory','normal'),
  ('IT',3,'IT-A',2,'09:00','09:50','Data Mining','LH-307','f0000000-0000-0000-0000-000000000208','theory','normal'),
  ('IT',3,'IT-A',2,'10:00','10:50','Mobile Application Development','LH-307','f0000000-0000-0000-0000-000000000208','theory','normal'),
  ('IT',3,'IT-A',2,'13:30','14:20','Data Mining','LH-307','f0000000-0000-0000-0000-000000000208','theory','normal'),
  ('IT',3,'IT-A',3,'09:00','09:50','Mobile Application Development','LH-307','f0000000-0000-0000-0000-000000000208','theory','normal'),
  ('IT',3,'IT-A',3,'11:15','12:05','Web Services','LH-307','f0000000-0000-0000-0000-000000000207','theory','normal'),
  ('IT',3,'IT-A',4,'09:00','09:50','Web Services','LH-307','f0000000-0000-0000-0000-000000000207','theory','normal'),
  ('IT',3,'IT-A',4,'10:00','10:50','Mobile Application Development','LH-307','f0000000-0000-0000-0000-000000000208','theory','normal'),
  ('IT',3,'IT-A',4,'11:15','12:05','Information Security','LH-307','f0000000-0000-0000-0000-000000000208','theory','normal'),
  ('IT',3,'IT-A',4,'13:30','14:20','Cloud Computing','LH-307','f0000000-0000-0000-0000-000000000207','theory','normal'),
  ('IT',3,'IT-A',4,'14:30','15:20','Data Mining','LH-307','f0000000-0000-0000-0000-000000000208','theory','normal'),
  ('IT',3,'IT-A',5,'09:00','09:50','Cloud Computing','LH-307','f0000000-0000-0000-0000-000000000207','theory','normal'),
  ('IT',3,'IT-A',5,'10:00','10:50','Cloud Computing','LH-307','f0000000-0000-0000-0000-000000000207','theory','normal'),
  ('IT',3,'IT-A',5,'13:30','14:20','Web Services','LH-307','f0000000-0000-0000-0000-000000000207','theory','normal'),
  ('MECH',2,'MECH-A',1,'13:30','15:20','Fluid Mechanics Lab','Lab-ME1','f0000000-0000-0000-0000-000000000210','lab','normal'),
  ('MECH',2,'MECH-A',4,'13:30','15:20','Fluid Mechanics Lab','Lab-ME1','f0000000-0000-0000-0000-000000000210','lab','normal'),
  ('MECH',2,'MECH-A',5,'14:30','15:20','Mentor Hour','LH-209','f0000000-0000-0000-0000-000000000209','mentoring','normal'),
  ('MECH',2,'MECH-A',1,'09:00','09:50','Fluid Mechanics','LH-209','f0000000-0000-0000-0000-000000000210','theory','normal'),
  ('MECH',2,'MECH-A',1,'10:00','10:50','Strength of Materials','LH-209','f0000000-0000-0000-0000-000000000209','theory','normal'),
  ('MECH',2,'MECH-A',2,'10:00','10:50','Strength of Materials','LH-209','f0000000-0000-0000-0000-000000000209','theory','normal'),
  ('MECH',2,'MECH-A',2,'11:15','12:05','Kinematics of Machinery','LH-209','f0000000-0000-0000-0000-000000000209','theory','normal'),
  ('MECH',2,'MECH-A',2,'13:30','14:20','Fluid Mechanics','LH-209','f0000000-0000-0000-0000-000000000210','theory','normal'),
  ('MECH',2,'MECH-A',2,'14:30','15:20','Kinematics of Machinery','LH-209','f0000000-0000-0000-0000-000000000209','theory','normal'),
  ('MECH',2,'MECH-A',3,'09:00','09:50','Strength of Materials','LH-209','f0000000-0000-0000-0000-000000000209','theory','normal'),
  ('MECH',2,'MECH-A',3,'10:00','10:50','Fluid Mechanics','LH-209','f0000000-0000-0000-0000-000000000210','theory','normal'),
  ('MECH',2,'MECH-A',3,'13:30','14:20','Thermodynamics','LH-209','f0000000-0000-0000-0000-000000000209','theory','normal'),
  ('MECH',2,'MECH-A',3,'14:30','15:20','Manufacturing Processes','LH-209','f0000000-0000-0000-0000-000000000210','theory','normal'),
  ('MECH',2,'MECH-A',4,'09:00','09:50','Kinematics of Machinery','LH-209','f0000000-0000-0000-0000-000000000209','theory','normal'),
  ('MECH',2,'MECH-A',4,'11:15','12:05','Thermodynamics','LH-209','f0000000-0000-0000-0000-000000000209','theory','normal'),
  ('MECH',2,'MECH-A',5,'10:00','10:50','Manufacturing Processes','LH-209','f0000000-0000-0000-0000-000000000210','theory','normal'),
  ('MECH',2,'MECH-A',5,'11:15','12:05','Manufacturing Processes','LH-209','f0000000-0000-0000-0000-000000000210','theory','normal'),
  ('MECH',2,'MECH-A',5,'13:30','14:20','Thermodynamics','LH-209','f0000000-0000-0000-0000-000000000209','theory','normal'),
  ('MECH',3,'MECH-A',1,'13:30','15:20','CAD Lab','Lab-ME2','f0000000-0000-0000-0000-000000000209','lab','normal'),
  ('MECH',3,'MECH-A',4,'13:30','15:20','CAD Lab','Lab-ME2','f0000000-0000-0000-0000-000000000209','lab','normal'),
  ('MECH',3,'MECH-A',5,'14:30','15:20','Mentor Hour','LH-309','f0000000-0000-0000-0000-000000000210','mentoring','normal'),
  ('MECH',3,'MECH-A',1,'09:00','09:50','Metrology','LH-309','f0000000-0000-0000-0000-000000000209','theory','normal'),
  ('MECH',3,'MECH-A',1,'10:00','10:50','CAD/CAM','LH-309','f0000000-0000-0000-0000-000000000210','theory','normal'),
  ('MECH',3,'MECH-A',1,'11:15','12:05','Heat and Mass Transfer','LH-309','f0000000-0000-0000-0000-000000000209','theory','normal'),
  ('MECH',3,'MECH-A',2,'09:00','09:50','Metrology','LH-309','f0000000-0000-0000-0000-000000000209','theory','normal'),
  ('MECH',3,'MECH-A',2,'10:00','10:50','Design of Machine Elements','LH-309','f0000000-0000-0000-0000-000000000210','theory','normal'),
  ('MECH',3,'MECH-A',2,'11:15','12:05','Design of Machine Elements','LH-309','f0000000-0000-0000-0000-000000000210','theory','normal'),
  ('MECH',3,'MECH-A',2,'14:30','15:20','Dynamics of Machinery','LH-309','f0000000-0000-0000-0000-000000000210','theory','normal'),
  ('MECH',3,'MECH-A',3,'11:15','12:05','Metrology','LH-309','f0000000-0000-0000-0000-000000000209','theory','normal'),
  ('MECH',3,'MECH-A',3,'13:30','14:20','Dynamics of Machinery','LH-309','f0000000-0000-0000-0000-000000000210','theory','normal'),
  ('MECH',3,'MECH-A',3,'14:30','15:20','Heat and Mass Transfer','LH-309','f0000000-0000-0000-0000-000000000209','theory','normal'),
  ('MECH',3,'MECH-A',4,'09:00','09:50','Design of Machine Elements','LH-309','f0000000-0000-0000-0000-000000000210','theory','normal'),
  ('MECH',3,'MECH-A',4,'11:15','12:05','CAD/CAM','LH-309','f0000000-0000-0000-0000-000000000210','theory','normal'),
  ('MECH',3,'MECH-A',5,'09:00','09:50','CAD/CAM','LH-309','f0000000-0000-0000-0000-000000000210','theory','normal'),
  ('MECH',3,'MECH-A',5,'10:00','10:50','Heat and Mass Transfer','LH-309','f0000000-0000-0000-0000-000000000209','theory','normal'),
  ('MECH',3,'MECH-A',5,'13:30','14:20','Dynamics of Machinery','LH-309','f0000000-0000-0000-0000-000000000210','theory','normal');

-- 5) tasks and forms (2 per division, all different)
insert into tasks(author,dept,year,section,title,kind,marks,due,fields) values
  ('f0000000-0000-0000-0000-000000000201','CSE',2,'CSE-A','Linked List Operations in C','assignment',20,'Fri','["Drive link", "Time complexity notes"]'),
  ('f0000000-0000-0000-0000-000000000201','CSE',2,'CSE-A','Coding Club Membership Form','form',0,'Mon','["Preferred language", "Prior projects"]'),
  ('f0000000-0000-0000-0000-000000000202','CSE',3,'CSE-A','Process Scheduling Simulator','assignment',25,'Next Wed','["GitHub repo", "Algorithm used"]'),
  ('f0000000-0000-0000-0000-000000000202','CSE',3,'CSE-A','Industrial Visit Consent - Chennai','form',0,'Tue','["Guardian phone", "Dietary needs"]'),
  ('f0000000-0000-0000-0000-000000000203','ECE',2,'ECE-A','Common Emitter Amplifier Report','assignment',15,'Thu','["Drive link", "Gain measured"]'),
  ('f0000000-0000-0000-0000-000000000203','ECE',2,'ECE-A','IEEE Student Branch Enrolment','form',0,'Mon','["IEEE number", "Interest area"]'),
  ('f0000000-0000-0000-0000-000000000204','ECE',3,'ECE-A','FIR Filter Design in MATLAB','assignment',20,'Mon','["Drive link", "Cutoff frequency"]'),
  ('f0000000-0000-0000-0000-000000000204','ECE',3,'ECE-A','VLSI Workshop Registration','form',0,'Fri','["Tool experience", "Laptop available"]'),
  ('f0000000-0000-0000-0000-000000000205','EEE',2,'EEE-A','Single-Phase Transformer Calculations','assignment',15,'Fri','["Drive link", "Efficiency result"]'),
  ('f0000000-0000-0000-0000-000000000205','EEE',2,'EEE-A','Energy Audit Club Signup','form',0,'Wed','["Hostel block", "Skills"]'),
  ('f0000000-0000-0000-0000-000000000206','EEE',3,'EEE-A','Load Flow Analysis Sheet','assignment',25,'Tue','["Drive link", "Bus count"]'),
  ('f0000000-0000-0000-0000-000000000206','EEE',3,'EEE-A','Smart Grid Seminar Registration','form',0,'Thu','["Department email", "Topic preference"]'),
  ('f0000000-0000-0000-0000-000000000207','IT',2,'IT-A','Sorting Algorithm Benchmark','assignment',20,'Wed','["GitHub repo", "Observed run times"]'),
  ('f0000000-0000-0000-0000-000000000207','IT',2,'IT-A','Hackathon Team Registration','form',0,'Mon','["Team name", "Member count", "Idea in one line"]'),
  ('f0000000-0000-0000-0000-000000000208','IT',3,'IT-A','Threat Model for a Web App','assignment',20,'Next Mon','["Drive link", "Top three risks"]'),
  ('f0000000-0000-0000-0000-000000000208','IT',3,'IT-A','Cloud Certification Interest Form','form',0,'Fri','["Preferred provider", "Exam month"]'),
  ('f0000000-0000-0000-0000-000000000209','MECH',2,'MECH-A','Steam Table Problem Set','assignment',15,'Thu','["Drive link", "Final enthalpy value"]'),
  ('f0000000-0000-0000-0000-000000000209','MECH',2,'MECH-A','Workshop Safety Declaration','form',0,'Tue','["Emergency contact", "Allergies"]'),
  ('f0000000-0000-0000-0000-000000000210','MECH',3,'MECH-A','Gear Train Design Calculation','assignment',25,'Next Tue','["Drive link", "Module chosen"]'),
  ('f0000000-0000-0000-0000-000000000210','MECH',3,'MECH-A','CAD Competition Entry','form',0,'Fri','["Software used", "Category"]');

-- 6) broadcasts (one per class division + two college-wide)
insert into broadcasts(author,scope,title,body) values
  ('f0000000-0000-0000-0000-000000000201','Class CSE II Year','Database Systems quiz on Thursday','Quiz covers normalization and ER diagrams. Bring your own calculator.'),
  ('f0000000-0000-0000-0000-000000000202','Class CSE III Year','Compiler Design lab record check','Submit your lexer and parser records before Friday afternoon.'),
  ('f0000000-0000-0000-0000-000000000203','Class ECE II Year','Circuits Lab batch change','Batch B moves to Tuesday afternoon starting next week.'),
  ('f0000000-0000-0000-0000-000000000204','Class ECE III Year','DSP assignment deadline extended','The FIR filter assignment is now due Monday morning.'),
  ('f0000000-0000-0000-0000-000000000205','Class EEE II Year','Machines Lab safety briefing','Attendance at the briefing is compulsory before the first experiment.'),
  ('f0000000-0000-0000-0000-000000000206','Class EEE III Year','Power Systems guest lecture','A utility engineer will speak on grid stability. Seminar hall, 2 PM.'),
  ('f0000000-0000-0000-0000-000000000207','Class IT II Year','Java Lab internal on Monday','Practical internal covers collections and exception handling.'),
  ('f0000000-0000-0000-0000-000000000208','Class IT III Year','Cloud Computing mini project teams','Form teams of three and register your topic by Wednesday.'),
  ('f0000000-0000-0000-0000-000000000209','Class MECH II Year','Fluid Mechanics tutorial moved','Thursday tutorial shifts to the drawing hall for numerical practice.'),
  ('f0000000-0000-0000-0000-000000000210','Class MECH III Year','CAD Lab software update','New CAD version is installed. Re-save old files before opening them.'),
  ('f0000000-0000-0000-0000-000000000201','College','Course feedback survey is open','Share your feedback on this semester by the end of next week.'),
  ('f0000000-0000-0000-0000-000000000209','College','Library hours extended during internals','The library stays open until 9 PM through the internal assessment fortnight.');

-- 7) notifications (unique per person)
insert into notifications(user_id,text) values
  ('50000000-0000-0000-0000-000000000101','Internal marks posted: Database Systems 45/50'),
  ('50000000-0000-0000-0000-000000000101','New assignment: Linked List Operations in C (due Fri)'),
  ('50000000-0000-0000-0000-000000000102','Internal marks posted: Operating Systems 34/50'),
  ('50000000-0000-0000-0000-000000000102','New assignment: Process Scheduling Simulator (due Next Wed)'),
  ('50000000-0000-0000-0000-000000000103','Internal marks posted: Electronic Circuits 39/50'),
  ('50000000-0000-0000-0000-000000000103','New assignment: Common Emitter Amplifier Report (due Thu)'),
  ('50000000-0000-0000-0000-000000000104','Internal marks posted: Digital Signal Processing 37/50'),
  ('50000000-0000-0000-0000-000000000104','New assignment: FIR Filter Design in MATLAB (due Mon)'),
  ('50000000-0000-0000-0000-000000000105','Internal marks posted: Electrical Machines I 44/50'),
  ('50000000-0000-0000-0000-000000000105','New assignment: Single-Phase Transformer Calculations (due Fri)'),
  ('50000000-0000-0000-0000-000000000106','Internal marks posted: Power Systems I 37/50'),
  ('50000000-0000-0000-0000-000000000106','New assignment: Load Flow Analysis Sheet (due Tue)'),
  ('50000000-0000-0000-0000-000000000107','Internal marks posted: Algorithms 40/50'),
  ('50000000-0000-0000-0000-000000000107','New assignment: Sorting Algorithm Benchmark (due Wed)'),
  ('50000000-0000-0000-0000-000000000108','Internal marks posted: Information Security 28/50'),
  ('50000000-0000-0000-0000-000000000108','New assignment: Threat Model for a Web App (due Next Mon)'),
  ('50000000-0000-0000-0000-000000000109','Internal marks posted: Thermodynamics 45/50'),
  ('50000000-0000-0000-0000-000000000109','New assignment: Steam Table Problem Set (due Thu)'),
  ('50000000-0000-0000-0000-000000000110','Internal marks posted: Design of Machine Elements 38/50'),
  ('50000000-0000-0000-0000-000000000110','New assignment: Gear Train Design Calculation (due Next Tue)'),
  ('f0000000-0000-0000-0000-000000000201','Swap request from Prof. R. Kumar: Seminar clash (pending)'),
  ('f0000000-0000-0000-0000-000000000202','Your swap request to Dr. Meera Iyer is pending'),
  ('f0000000-0000-0000-0000-000000000203','Swap request from Prof. Anjali Deshmukh: Medical appointment (accepted)'),
  ('f0000000-0000-0000-0000-000000000204','Your swap request to Dr. S. Nair is accepted'),
  ('f0000000-0000-0000-0000-000000000205','Swap request from Prof. Lakshmi Narayanan: Conference travel (rejected)'),
  ('f0000000-0000-0000-0000-000000000206','Your swap request to Dr. Vikram Singh is rejected'),
  ('f0000000-0000-0000-0000-000000000207','Swap request from Prof. T. Suresh: Invigilation duty (pending)'),
  ('f0000000-0000-0000-0000-000000000208','Your swap request to Dr. Farah Khan is pending'),
  ('f0000000-0000-0000-0000-000000000209','Swap request from Prof. Deepa Menon: Lab inspection (accepted)'),
  ('f0000000-0000-0000-0000-000000000210','Your swap request to Dr. Rajesh Gupta is accepted');

-- 8) swap requests (one per department, different statuses)
insert into schedule_requests(from_id,to_id,schedule_id,reason,status)
select v.f::uuid, v.t::uuid, s.id, v.reason, v.status from (values
  ('f0000000-0000-0000-0000-000000000202','f0000000-0000-0000-0000-000000000201','CSE',3,2,'09:00','Seminar clash','pending'),
  ('f0000000-0000-0000-0000-000000000204','f0000000-0000-0000-0000-000000000203','ECE',3,1,'09:00','Medical appointment','accepted'),
  ('f0000000-0000-0000-0000-000000000206','f0000000-0000-0000-0000-000000000205','EEE',3,1,'09:00','Conference travel','rejected'),
  ('f0000000-0000-0000-0000-000000000208','f0000000-0000-0000-0000-000000000207','IT',3,1,'09:00','Invigilation duty','pending'),
  ('f0000000-0000-0000-0000-000000000210','f0000000-0000-0000-0000-000000000209','MECH',3,1,'10:00','Lab inspection','accepted')
) as v(f,t,dept,year,weekday,start_t,reason,status)
join schedule s on s.dept=v.dept and s.year=v.year and s.weekday=v.weekday and s.start_t=v.start_t::time;

-- 9) read receipts: every second student has already opened their class broadcast
insert into read_status(user_id,item_type,item_id)
select u.id,'broadcast',b.id from (values
  ('S101','Database Systems quiz on Thursday'),
  ('S103','Circuits Lab batch change'),
  ('S105','Machines Lab safety briefing'),
  ('S107','Java Lab internal on Monday'),
  ('S109','Fluid Mechanics tutorial moved')
) as v(login,title)
join users u on u.login_id=v.login join broadcasts b on b.title=v.title;

-- 10) convenience view: today's timetable (India time, Mon-Fri). Respects RLS of the caller.
create or replace view todays_schedule with (security_invoker = true) as
  select * from schedule where weekday = extract(isodow from (now() at time zone 'Asia/Kolkata'))::int;

-- Quick checks (run separately):
--   select dept, count(*) filter (where role='student') as students from users u join students s on s.user_id=u.id group by dept;
--   select dept, year, count(*) from schedule group by 1,2 order by 1,2;
