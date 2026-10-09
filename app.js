/* /* =========================================================
   CAMPUS HUB
   app.js
   ========================================================= */

/* ===== SUPABASE CONFIG =====
   Paste your Supabase project values here to go live.
   See "Supabase setup" on login.
========================================================= */

const CONFIG = {
  url: '',
  key: ''
};

let sb = null;


/* =========================================================
   HELPERS
========================================================= */

const $ = s => document.querySelector(s);

const esc = t =>
  String(t).replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[c]));

const toast = m => {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = m;

  $('#toasts').append(t);

  setTimeout(() => t.remove(), 2600);
};

const nowHM = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

const mins = t =>
  +t.slice(0, 2) * 60 + +t.slice(3);


/* =========================================================
   MOCK DATA
========================================================= */

const D = {

  users: {

    /* ================= STUDENT ================= */

    S101: {
      pw: 'demo123',
      role: 'student',
      name: 'Arun',
      dept: 'CSE',
      sec: 'B',

      cgpa: 8.4,

      /* Overall attendance */
      att: 86,

      /* Subject-wise attendance */
      attendance: {
        DBMS: 92,
        OS: 78,
        Maths: 88,
        Networks: 68
      },

      /* Internal marks */
      marks: {
        DBMS: 41,
        OS: 36,
        Maths: 44,
        Networks: 33
      }
    },


    /* ================= FACULTY ================= */

    F201: {
      pw: 'demo123',
      role: 'faculty',
      name: 'Dr. Meera Iyer',
      dept: 'CSE'
    }

  },


  /* =======================================================
     SCHEDULE
  ======================================================= */

  sched: [

    {
      id: 1,
      start: '09:00',
      end: '09:50',
      subj: 'Database Systems',
      room: 'LH-204',
      fac: 'Dr. Meera Iyer',
      sec: 'CSE-B',
      status: 'normal'
    },

    {
      id: 2,
      start: '10:00',
      end: '10:50',
      subj: 'Operating Systems',
      room: 'LH-101',
      fac: 'Prof. R. Kumar',
      sec: 'CSE-B',
      status: 'normal'
    },

    {
      id: 3,
      start: '11:15',
      end: '12:05',
      subj: 'Computer Networks',
      room: 'LH-204',
      fac: 'Dr. Meera Iyer',
      sec: 'CSE-A',
      status: 'normal'
    },

    {
      id: 4,
      start: '13:30',
      end: '16:30',
      subj: 'DBMS Lab',
      room: 'Lab-3',
      fac: 'Dr. Meera Iyer',
      sec: 'CSE-B',
      status: 'normal'
    }

  ],


  /* =======================================================
     TASKS
  ======================================================= */

  tasks: [

    {
      id: 1,
      title: 'ER Diagram Assignment',
      subj: 'DBMS',
      due: 'Fri',
      marks: 20,
      kind: 'assignment',
      fields: ['Drive link', 'Notes'],
      done: false
    },

    {
      id: 2,
      title: 'Hackathon Registration Form',
      subj: 'Campus',
      due: 'Mon',
      marks: 0,
      kind: 'form',
      fields: [
        'Team name',
        'Member count',
        'Idea in one line'
      ],
      done: false
    },

    {
      id: 3,
      title: 'OS Lab Record',
      subj: 'OS',
      due: 'Done',
      marks: 10,
      kind: 'assignment',
      fields: ['Drive link'],
      done: true
    }

  ],


  /* =======================================================
     FACULTY BROADCASTS
  ======================================================= */

  bc: [

    {
      id: 1,
      from: 'Dr. Meera Iyer',
      scope: 'Section CSE-B',
      title: 'DBMS lab shifted to Lab-3',
      body: 'Bring your records. Viva begins this week.',
      time: '8:10 AM'
    },

    {
      id: 2,
      from: 'Prof. R. Kumar',
      scope: 'Class CSE Y2',
      title: 'OS quiz on Thursday',
      body: 'Covers scheduling and deadlocks.',
      time: 'Yesterday'
    }

  ],


  /* =======================================================
     INSTITUTIONAL UPDATES
  ======================================================= */

  upd: [

    {
      id: 1,
      tag: 'Exams',
      title: 'Internal assessment 2 timetable released',
      body: 'Starts 20 Oct. Hall tickets at the exam cell.'
    },

    {
      id: 2,
      tag: 'Events',
      title: 'Tech fest registrations open',
      body: 'Pick up to 3 events. Closes next Friday.'
    },

    {
      id: 3,
      tag: 'Holiday',
      title: 'Campus closed on Friday',
      body: 'Local festival holiday. Classes resume Monday.'
    }

  ],


  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  notes: [

    {
      id: 1,
      text: 'Assignment "ER Diagram" due Friday',
      time: '1h'
    },

    {
      id: 2,
      text: 'Operating Systems moved to LH-101',
      time: '3h'
    }

  ],


  read: new Set(),


  /* =======================================================
     FACULTY SWAP REQUESTS
  ======================================================= */

  req: [

    {
      id: 1,
      from: 'Prof. R. Kumar',
      to: 'Dr. Meera Iyer',
      slot: 'Computer Networks, 11:15',
      reason: 'Seminar clash',
      status: 'pending',
      mine: false
    }

  ],


  /* =======================================================
     ACADEMIC PULSE
  ======================================================= */

  pulse: [

    {
      n: 'Riya S.',
      att: 62,
      m: 21,
      cg: 6.1
    },

    {
      n: 'Karan P.',
      att: 71,
      m: 25,
      cg: 6.9
    },

    {
      n: 'Aarav Menon',
      att: 86,
      m: 38.5,
      cg: 8.4
    },

    {
      n: 'Nisha T.',
      att: 94,
      m: 44,
      cg: 9.1
    },

    {
      n: 'Dev A.',
      att: 58,
      m: 19,
      cg: 5.8
    }

  ],


  log: [
    'Published DBMS lab update to CSE-B'
  ]

};


/* =========================================================
   SUPABASE
========================================================= */

async function initSb() {

  if (!CONFIG.url || sb) return;

  await new Promise(resolve => {

    const s = document.createElement('script');

    s.src =
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/dist/umd/supabase.js';

    s.onload = resolve;

    document.head.append(s);

  });

  sb = supabase.createClient(
    CONFIG.url,
    CONFIG.key
  );
}


async function signIn(id, pw) {

  await initSb();

  /* ================= LIVE SUPABASE ================= */

  if (sb) {

    const {
      error
    } = await sb.auth.signInWithPassword({

      email:
        id.toLowerCase() + '@campus.hub',

      password: pw

    });

    if (error) throw error;


    const {
      data
    } = await sb
      .from('users')
      .select('role,name')
      .eq('login_id', id)
      .single();


    return {
      id,
      ...data,

      dept: 'CSE',
      sec: 'B',

      marks: {},

      cgpa: 0,

      att: 0,

      attendance: {}
    };
  }


  /* ================= MOCK MODE ================= */

  await new Promise(r =>
    setTimeout(r, 600)
  );

  const u =
    D.users[id.toUpperCase()];

  if (!u || u.pw !== pw) {

    throw Error(
      'Wrong ID or password'
    );
  }

  return {
    id: id.toUpperCase(),
    ...u
  };
}


async function save(table, row) {

  if (sb) {
    await sb
      .from(table)
      .insert(row);
  }

}


/* =========================================================
   UI HELPERS
========================================================= */

let me = null;
let tab = '';
let filt = 'All';
let q = '';


const ring = (p, l, c) => `
  <div
    class="ring"
    style="--p:${p}${c ? `;--c:${c}` : ''}"
  >
    <div>
      <b>
        ${p}${l.includes('CGPA') ? '' : '%'}
      </b>

      <small>${l}</small>
    </div>
  </div>
`;


const empty = (i, t) => `
  <div class="empty">
    <big>${i}</big>
    ${t}
  </div>
`;


const open = html => {

  $('#dr').innerHTML =
    html +
    `
      <button
        class="ghost"
        style="margin-top:14px"
        data-act="close"
      >
        Close
      </button>
    `;

  $('#dr').classList.add('show');

  $('#vl').classList.add('show');
};


const closeDr = () => {

  $('#dr').classList.remove('show');

  $('#vl').classList.remove('show');
};


function field(f) {

  return `
    <label>
      ${esc(f)}

      <input
        name="${esc(f)}"
        required
      >
    </label>
  `;
}


/* =========================================================
   SCHEDULE COMPONENT
========================================================= */

function sched(list, editable) {

  if (!list.length) {

    return empty(
      '',
      'No classes today. Enjoy the free day.'
    );

  }


  const n = nowHM();


  return `
    <div class="tl">

      ${list.map(s => {

        const live =
          n >= mins(s.start) &&
          n < mins(s.end);


        return `
          <div
            class="card it ${live ? 'now' : ''}"
          >

            <div class="row">

              <b>
                ${s.start} – ${s.end}
              </b>

              <span>

                ${
                  live
                    ? '<span class="chip g">Live now</span>'
                    : ''
                }

                ${
                  s.status !== 'normal'
                    ? `
                      <span class="chip y">
                        ${esc(s.status)}
                      </span>
                    `
                    : ''
                }

              </span>

            </div>


            <h3 style="margin:2px 0">
              ${esc(s.subj)}
            </h3>


            <div class="mut">
              ${esc(s.room)}
              ·
              ${esc(s.sec)}
              ·
              ${esc(s.fac)}
            </div>

          </div>
        `;

      }).join('')}

    </div>
  `;
}


/* =========================================================
   LOGIN
========================================================= */

function loginView() {

  document.body.className = 'login';


  $('#root').innerHTML = `

    <div class="lg">

      <form
        class="box"
        id="lf"
      >

        <h1>Campus Hub</h1>

        <p class="mut">
          Your day, your classes, one place.
        </p>


        <label>
          Roll No / Faculty ID

          <input
            id="lid"
            autocomplete="username"
            required
            placeholder="S101 or F201"
          >
        </label>


        <label>
          Password

          <input
            id="lpw"
            type="password"
            autocomplete="current-password"
            required
          >
        </label>


        <button
          style="width:100%"
          id="lb"
        >
          Sign in
        </button>


        <div class="demo">

          <button
            type="button"
            data-fill="S101"
          >
            Demo student
          </button>

          <button
            type="button"
            data-fill="F201"
          >
            Demo faculty
          </button>

        </div>


        <a
          href="#"
          data-act="sql"
          class="mut"
        >
          Supabase setup (SQL + RLS)
        </a>

      </form>

    </div>

  `;


  $('#lf').onsubmit = async e => {

    e.preventDefault();

    $('#lb').textContent =
      'Signing in…';


    try {

      me = await signIn(
        $('#lid').value.trim(),
        $('#lpw').value
      );


      tab = 'today';

      boot();

    } catch (err) {

      toast(err.message);

      $('#lb').textContent =
        'Sign in';

    }

  };

}


/* =========================================================
   NAVIGATION
========================================================= */

const NAV = {

  student: [

    ['today', '', 'Today'],

    ['inbox', '', 'Inbox'],

    ['tasks', '', 'Tasks'],

    ['grades', '', 'Grades'],

    ['alerts', '', 'Alerts']

  ],


  faculty: [

    ['today', '', 'Command'],

    ['bcast', '', 'Broadcast'],

    ['tasks', '', 'Tasks'],

    ['pulse', '', 'Pulse'],

    ['swap', '', 'Schedule'],

    ['alerts', '', 'Activity']

  ]

};


function boot() {

  document.body.className =
    me.role;

  filt = 'All';

  q = '';

  render();

}


/* =========================================================
   MAIN RENDER
========================================================= */

async function render() {

  const unread = [

    ...D.bc,

    ...D.upd.map(u => ({
      id: 'u' + u.id
    }))

  ].filter(
    x => !D.read.has(x.id)
  ).length;


  $('#root').innerHTML = `

    <div class="app">

      <nav>

        <div class="logo">
          Campus Hub
        </div>


        ${NAV[me.role].map(
          ([k, i, l]) => `

            <button
              data-tab="${k}"
              class="${tab === k ? 'on' : ''}"
            >

              ${i}

              <span>

                ${l}

                ${
                  k === 'inbox' && unread
                    ? '<span class="dot"></span>'
                    : ''
                }

              </span>

            </button>

          `
        ).join('')}


        <button
          data-act="out"
          style="margin-top:auto"
        >

          

          <span>
            Sign out
          </span>

        </button>

      </nav>


      <main>

        <div class="top">

          <div class="mut">

            ${esc(me.name)}

            ·

            ${
              me.role === 'student'
                ? `${me.dept}-${me.sec}`
                : me.dept + ' faculty'
            }

          </div>


          ${
            me.role === 'student'
              ? `
                <input
                  id="q"
                  placeholder="Search tasks, broadcasts, updates…"
                  style="max-width:340px;margin:0"
                  value="${esc(q)}"
                >
              `
              : ''
          }


          <div id="sr"></div>

        </div>


        <div id="view">

          <div class="skel"></div>

          <div class="skel"></div>

        </div>

      </main>

    </div>

  `;


  const qi = $('#q');


  if (qi) {

    qi.oninput = () => {

      q = qi.value;

      showSearch();

    };

  }


  await new Promise(
    r => setTimeout(r, 250)
  );


  $('#view').innerHTML =
    VIEWS[me.role][tab]();

}


/* =========================================================
   SEARCH
========================================================= */

function showSearch() {

  const s =
    q.toLowerCase();

  const box =
    $('#sr');


  if (!s) {

    box.innerHTML = '';

    return;

  }


  const hits = [

    ...D.tasks.map(t => ({
      k: 'task',
      id: t.id,
      t: t.title,
      s: 'Task'
    })),

    ...D.bc.map(b => ({
      k: 'bc',
      id: b.id,
      t: b.title,
      s: 'Broadcast'
    })),

    ...D.upd.map(u => ({
      k: 'upd',
      id: u.id,
      t: u.title,
      s: 'Official'
    }))

  ].filter(
    x => x.t
      .toLowerCase()
      .includes(s)
  );


  box.innerHTML = `

    <div class="card">

      ${
        hits.length

          ? hits.map(h => `

              <div
                class="row click"
                style="cursor:pointer;padding:6px 0"
                data-hit="${h.k}:${h.id}"
              >

                <span>
                  ${esc(h.t)}
                </span>

                <span class="chip v">
                  ${h.s}
                </span>

              </div>

            `).join('')

          : `
            <span class="mut">
              Nothing matches.
              Try a subject name.
            </span>
          `
      }

    </div>

  `;

}


/* =========================================================
   STUDENT COMPONENTS
========================================================= */

const chipsRow = opts => `

  <div class="chips">

    ${opts.map(
      o => `

        <button
          class="${filt === o ? 'on' : ''}"
          data-filt="${o}"
        >
          ${o}
        </button>

      `
    ).join('')}

  </div>

`;


const msgCard = (m, type) => {

  const id =
    type === 'upd'
      ? 'u' + m.id
      : m.id;

  const un =
    !D.read.has(id);


  return `

    <div
      class="card click ${un ? 'unread' : ''}"
      data-msg="${type}:${m.id}"
    >

      <div class="row">

        <span>

          <span
            class="chip ${
              type === 'upd'
                ? 'v'
                : 'y'
            }"
          >

            ${esc(
              type === 'upd'
                ? m.tag
                : m.scope
            )}

          </span>


          ${
            un
              ? '<span class="chip r">New</span>'
              : ''
          }

        </span>


        <span class="mut">
          ${esc(m.time || 'Official')}
        </span>

      </div>


      <h3 style="margin:6px 0 2px">
        ${esc(m.title)}
      </h3>


      <div class="mut">

        ${
          type === 'upd'
            ? 'Institution update'
            : 'From ' + m.from
        }

      </div>

    </div>

  `;
};


function taskCard(t) {

  return `

    <div
      class="card click"
      data-task="${t.id}"
    >

      <div class="row">

        <span>

          <span
            class="chip ${
              t.kind === 'form'
                ? 'v'
                : 'y'
            }"
          >
            ${t.kind}
          </span>


          ${
            t.done

              ? '<span class="chip g">Submitted</span>'

              : `
                <span class="chip r">
                  Due ${esc(t.due)}
                </span>
              `
          }

        </span>


        <span class="mut">

          ${
            t.marks
              ? t.marks + ' marks'
              : 'No marks'
          }

        </span>

      </div>


      <h3 style="margin:6px 0 2px">
        ${esc(t.title)}
      </h3>


      <div class="mut">
        ${esc(t.subj)}
      </div>

    </div>

  `;
}


/* =========================================================
   STUDENT VIEWS
========================================================= */

const VIEWS = {

  student: {

    /* =====================================================
       STUDENT DASHBOARD
    ===================================================== */

    today() {

      const h = new Date().getHours();
      const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
      
      const todo = D.tasks.filter(t => !t.done).length;

      return `
        <div class="dynamic-hub">
          <h1 class="hub-title" style="animation: fadeDown 1s ease-out forwards;">
            What do you want to do today, <br/>
            <span style="color: var(--b)">${esc(me.name.split(' ')[0])}?</span>
          </h1>

          <div class="hub-galaxy">
            
            <button class="hub-card float-1" onclick="document.getElementById('sched-section').scrollIntoView({behavior:'smooth'})">
              <div class="hub-icon"><div class="hub-icon-elem pulse-circle"></div></div>
              <span>Wanna check your schedule?</span>
            </button>

            <button class="hub-card float-2" data-tab="inbox">
              <div class="hub-icon wave-bars">
                <i class="hub-icon-elem"></i><i class="hub-icon-elem"></i><i class="hub-icon-elem"></i>
              </div>
              <span>Have a look on broadcast?</span>
            </button>

            <button class="hub-card float-3" data-tab="grades">
              <div class="hub-icon"><div class="hub-icon-elem spin-ring"></div></div>
              <span>Your current academic progress?</span>
            </button>

            <button class="hub-card float-4" data-tab="tasks">
              <div class="hub-icon"><div class="hub-icon-elem bounce-dot"></div></div>
              <span>Review your pending tasks?</span>
            </button>

            <button class="hub-card float-5" data-tab="alerts">
              <div class="hub-icon"><div class="hub-icon-elem flash-bell"></div></div>
              <span>Check system alerts?</span>
            </button>

          </div>
        </div>

        <div id="sched-section" class="grid" style="margin-top: 150px; opacity: 0; animation: fadeIn 2s ease-out 1s forwards;">
          <div>
            <h2 style="border-bottom: 2px solid var(--line); padding-bottom: 12px; margin-bottom: 20px;">
              Today's schedule
            </h2>
            ${sched(D.sched.filter(s => s.sec === 'CSE-B'))}
          </div>
          <div>
            <h2 style="border-bottom: 2px solid var(--line); padding-bottom: 12px; margin-bottom: 20px;">
              Up next
            </h2>
            ${sched(D.sched.filter(s => s.sec === 'CSE-B').slice(1, 3))}
          </div>
        </div>
      `;
    },

    inbox() {

      const all = [

        ...D.bc.map(b => ({
          ...b,
          t: 'bc'
        })),

        ...D.upd.map(u => ({
          ...u,
          t: 'upd'
        }))

      ];


      const l = all.filter(m =>

        filt === 'All'

        ||

        (
          filt === 'Faculty' &&
          m.t === 'bc'
        )

        ||

        (
          filt === 'Official' &&
          m.t === 'upd'
        )

        ||

        (
          filt === 'Unread' &&
          !D.read.has(
            m.t === 'upd'
              ? 'u' + m.id
              : m.id
          )
        )

      );


      return `

        <h1>
          Inbox
        </h1>


        ${chipsRow([
          'All',
          'Faculty',
          'Official',
          'Unread'
        ])}


        <button
          class="ghost"
          data-act="readall"
          style="margin-bottom:12px"
        >
          Mark all read
        </button>


        ${
          l
            .map(
              m => msgCard(
                m,
                m.t
              )
            )
            .join('')

          ||

          empty(
            '',
            'Nothing here. Switch filters to see more.'
          )
        }

      `;

    },


    /* =====================================================
       TASKS
    ===================================================== */

    tasks() {

      const l =
        D.tasks.filter(t =>

          filt === 'All'

          ||

          (
            filt === 'To do' &&
            !t.done
          )

          ||

          (
            filt === 'Done' &&
            t.done
          )

          ||

          (
            filt === 'Forms' &&
            t.kind === 'form'
          )

        );


      return `

        <h1>
          Tasks and forms
        </h1>


        ${chipsRow([
          'All',
          'To do',
          'Done',
          'Forms'
        ])}


        ${
          l
            .map(taskCard)
            .join('')

          ||

          empty(
            '',
            'No tasks in this view.'
          )
        }

      `;

    },


    /* =====================================================
       GRADES
    ===================================================== */

    grades() {

      const attendance =
        me.attendance || {};


      return `

        <h1>
          Academic overview
        </h1>


        <!-- OVERALL -->

        <div class="card">

          <div class="rings">

            ${ring(
              me.att,
              'Attendance',
              me.att < 75
                ? '#ff5470'
                : '#2ecc71'
            )}


            ${ring(
              Math.round(
                me.cgpa * 10
              ),
              'CGPA ' + me.cgpa
            )}

          </div>

        </div>


        <!-- SUBJECT ATTENDANCE -->

        <h2>
          Subject attendance
        </h2>


        <div class="card">

          ${
            Object.entries(
              attendance
            ).map(
              ([subject, percentage]) => `

                <div
                  style="
                    margin-bottom:16px
                  "
                >

                  <div class="row">

                    <b>
                      ${esc(subject)}
                    </b>


                    <span
                      class="chip ${
                        percentage < 75
                          ? 'r'
                          : percentage < 80
                            ? 'y'
                            : 'g'
                      }"
                    >
                      ${percentage}%
                    </span>

                  </div>


                  <div
                    class="bar"
                    style="
                      margin-top:6px
                    "
                  >

                    <i
                      style="
                        width:${percentage}%
                      "
                    ></i>

                  </div>

                </div>

              `
            ).join('')

            ||

            empty(
              '',
              'Subject attendance not available.'
            )
          }

        </div>


        <!-- INTERNAL MARKS -->

        <h2>
          Internal marks (out of 50)
        </h2>


        <div class="card">

          ${
            Object.entries(
              me.marks || {}
            ).map(
              ([s, m]) => `

                <div
                  style="
                    margin-bottom:12px
                  "
                >

                  <div class="row">

                    <b>
                      ${esc(s)}
                    </b>

                    <span>
                      ${m}/50
                    </span>

                  </div>


                  <div class="bar">

                    <i
                      style="
                        width:${m * 2}%
                      "
                    ></i>

                  </div>

                </div>

              `
            ).join('')
          }

        </div>


        ${
          me.att < 85

            ? `
              <div class="card">

                <span class="chip y">
                  Heads up
                </span>

                Keep attendance above
                75% to sit semester exams.

              </div>
            `

            : ''
        }

      `;

    },


    /* =====================================================
       ALERTS
    ===================================================== */

    alerts() {

      return `

        <h1>
          Notifications
        </h1>


        ${
          D.notes.map(
            n => `

              <div class="card">

                <div class="row">

                  <span>
                    ${esc(n.text)}
                  </span>

                  <span class="mut">
                    ${n.time}
                  </span>

                </div>

              </div>

            `
          ).join('')

          ||

          empty(
            '',
            'No alerts right now.'
          )
        }


        ${
          D.notes.length

            ? `
              <button
                class="ghost"
                data-act="clear"
              >
                Clear all
              </button>
            `

            : ''
        }

      `;

    }

  },


  /* =======================================================
     FACULTY VIEWS
  ======================================================= */

  faculty: {

    /* =====================================================
       COMMAND CENTER
    ===================================================== */

    today() {

      const mine =
        D.sched.filter(
          s => s.fac === me.name
        );


      const p =
        D.pulse.filter(
          s => s.att < 75
        ).length;


      return `

        <div class="hero">

          <h1>
            Command Center
          </h1>

          <p>

            ${mine.length}
            classes today

            ·

            ${p}
            students need attention

            ·

            ${
              D.req.filter(
                r =>
                  !r.mine &&
                  r.status === 'pending'
              ).length
            }
            swap request

          </p>

        </div>


        <div
          class="row"
          style="margin-bottom:14px"
        >

          <button data-tab="bcast">
             Broadcast
          </button>

          <button data-tab="tasks">
             New task
          </button>

          <button data-tab="swap">
             Edit schedule
          </button>

        </div>


        <h2>
          Your teaching day
        </h2>


        ${sched(mine)}

      `;

    },


    /* =====================================================
       BROADCAST
    ===================================================== */

    bcast() {

      return `

        <h1>
          Broadcast Studio
        </h1>


        <form
          class="card"
          id="bf"
        >

          <label>

            Send to

            <select id="bs">

              <option>
                College
              </option>

              <option>
                Department CSE
              </option>

              <option selected>
                Section CSE-B
              </option>

              <option>
                Class CSE Y2
              </option>

            </select>

          </label>


          <label>

            Title

            <input
              id="bt"
              required
            >

          </label>


          <label>

            Message

            <textarea
              id="bm"
              rows="3"
              required
            ></textarea>

          </label>


          <button>
            Send broadcast
          </button>

        </form>


        <h2>
          Sent
        </h2>


        ${
          D.bc.map(
            b => `

              <div class="card">

                <span class="chip v">
                  ${esc(b.scope)}
                </span>


                <h3
                  style="
                    margin:6px 0 0
                  "
                >
                  ${esc(b.title)}
                </h3>


                <div class="mut">
                  ${esc(b.from)}
                  ·
                  ${b.time}
                </div>

              </div>

            `
          ).join('')
        }

      `;

    },


    /* =====================================================
       FACULTY TASKS
    ===================================================== */

    tasks() {

      return `

        <h1>
          Task Studio
        </h1>


        <form
          class="card"
          id="tf"
        >

          <label>

            Title

            <input
              id="tt"
              required
            >

          </label>


          <div class="row">

            <label style="flex:1">

              Type

              <select id="tk">

                <option value="assignment">
                  Assignment
                </option>

                <option value="form">
                  Form
                </option>

              </select>

            </label>


            <label style="flex:1">

              Marks

              <input
                id="tm"
                type="number"
                value="10"
                min="0"
              >

            </label>

          </div>


          <label>

            Fields students fill
            (comma separated)

            <input
              id="tfl"
              value="Drive link"
            >

          </label>


          <button>
            Publish task
          </button>

        </form>


        <h2>
          Published
        </h2>


        ${
          D.tasks.map(
            t => `

              <div class="card">

                <div class="row">

                  <b>
                    ${esc(t.title)}
                  </b>

                  <span
                    class="chip ${
                      t.kind === 'form'
                        ? 'v'
                        : 'y'
                    }"
                  >
                    ${t.kind}
                  </span>

                </div>


                <div
                  class="bar"
                  style="margin-top:8px"
                >

                  <i
                    style="
                      width:${t.done ? 64 : 38}%
                    "
                  ></i>

                </div>


                <div class="mut">
                  ${t.done ? '23' : '14'}
                  of 36 submitted
                </div>

              </div>

            `
          ).join('')
        }

      `;

    },


    /* =====================================================
       ACADEMIC PULSE
    ===================================================== */

    pulse() {

      const avg = k =>
        D.pulse.reduce(
          (a, s) => a + s[k],
          0
        ) / D.pulse.length;


      return `

        <h1>
          Academic Pulse
        </h1>


        <div class="card">

          <div class="rings">

            ${ring(
              Math.round(avg('att')),
              'Avg attendance'
            )}


            ${ring(
              Math.round(avg('m') * 2),
              'Avg internals',
              '#ff7ad9'
            )}


            ${ring(
              Math.round(avg('cg') * 10),
              'CGPA ' +
                avg('cg').toFixed(1),
              '#2ee6c5'
            )}

          </div>

        </div>


        <h2>
          Student attention
        </h2>


        ${
          [...D.pulse]
            .sort(
              (a, b) =>
                a.att - b.att
            )
            .map(
              s => `

                <div class="card">

                  <div class="row">

                    <b>
                      ${esc(s.n)}
                    </b>


                    <span>

                      ${
                        s.att < 75
                          ? `
                            <span class="chip r">
                              Low attendance
                            </span>
                          `
                          : ''
                      }


                      ${
                        s.m < 25
                          ? `
                            <span class="chip y">
                              Weak internals
                            </span>
                          `
                          : ''
                      }


                      ${
                        s.att >= 75 &&
                        s.m >= 25
                          ? `
                            <span class="chip g">
                              On track
                            </span>
                          `
                          : ''
                      }

                    </span>

                  </div>


                  <div class="mut">

                    Attendance
                    ${s.att}%

                    ·

                    Internals
                    ${s.m}/50

                    ·

                    CGPA
                    ${s.cg}

                  </div>


                  <div
                    class="bar"
                    style="margin-top:6px"
                  >

                    <i
                      style="
                        width:${s.att}%
                      "
                    ></i>

                  </div>

                </div>

              `
            ).join('')
        }

      `;

    },


    /* =====================================================
       FACULTY SCHEDULE
    ===================================================== */

    swap() {

      const opts =
        D.sched.map(
          s => `

            <option value="${s.id}">

              ${s.start}
              ${esc(s.subj)}
              (${esc(s.sec)})

            </option>

          `
        ).join('');


      return `

        <h1>
          Schedule
        </h1>


        <h2>
          Swap requests
        </h2>


        ${
          D.req.map(
            r => `

              <div class="card">

                <div class="row">

                  <span>

                    <b>
                      ${esc(r.from)}
                    </b>

                    →

                    ${esc(r.to)}

                  </span>


                  <span
                    class="chip ${
                      r.status === 'accepted'
                        ? 'g'
                        : r.status === 'rejected'
                          ? 'r'
                          : 'y'
                    }"
                  >
                    ${r.status}
                  </span>

                </div>


                <div class="mut">

                  ${esc(r.slot)}
                  ·
                  ${esc(r.reason)}

                </div>


                ${
                  !r.mine &&
                  r.status === 'pending'

                    ? `

                      <div
                        class="row"
                        style="
                          margin-top:10px;
                          justify-content:flex-start
                        "
                      >

                        <button
                          class="ok"
                          data-req="${r.id}:accepted"
                        >
                          Accept
                        </button>


                        <button
                          class="no"
                          data-req="${r.id}:rejected"
                        >
                          Reject
                        </button>

                      </div>

                    `

                    : ''
                }

              </div>

            `
          ).join('')
        }


        <button
          class="ghost"
          data-act="newreq"
          style="margin-bottom:18px"
        >
          Request a swap
        </button>


        <h2>
          Schedule Editor
        </h2>


        <form
          class="card"
          id="ef"
        >

          <label>

            Class

            <select id="es">
              ${opts}
            </select>

          </label>


          <label>

            Change

            <select id="ec">

              <option value="Room changed">
                New room
              </option>

              <option value="Moved">
                New time
              </option>

              <option value="Cancelled">
                Cancel class
              </option>

            </select>

          </label>


          <label>

            New value
            (room or time)

            <input
              id="ev"
              placeholder="e.g. Lab-5 or 14:00"
            >

          </label>


          <button>
            Publish to affected students
          </button>

        </form>

      `;

    },


    /* =====================================================
       ACTIVITY
    ===================================================== */

    alerts() {

      return `

        <h1>
          Activity
        </h1>


        <div
          class="card tl"
          style="padding-left:30px"
        >

          ${
            D.log.map(
              l => `

                <div
                  style="padding:6px 0"
                >
                  ${esc(l)}
                </div>

              `
            ).join('')
          }

        </div>


        <h2>
          Notifications
        </h2>


        ${
          D.notes.map(
            n => `

              <div class="card">
                ${esc(n.text)}
              </div>

            `
          ).join('')
        }

      `;

    }

  }

};


/* =========================================================
   ACTIONS
========================================================= */

const log = m => {
  D.log.unshift(m);
};


/* =========================================================
   SUPABASE SQL
========================================================= */

const SQL = `

-- Create users in Supabase Auth with email
-- <id>@campus.hub
-- then insert matching rows.

create table users(
  id uuid primary key references auth.users,
  login_id text unique,
  role text check(role in('student','faculty')),
  name text
);

create table students(
  user_id uuid primary key references users,
  dept text,
  section text,
  attendance int,
  cgpa numeric,
  internals jsonb
);

create table faculty(
  user_id uuid primary key references users,
  dept text
);

create table schedule(
  id bigserial primary key,
  start_t time,
  end_t time,
  subject text,
  room text,
  faculty_id uuid references users,
  section text,
  status text default 'normal'
);

create table tasks(
  id bigserial primary key,
  author uuid references users,
  title text,
  kind text,
  marks int,
  due text,
  section text,
  fields jsonb
);

create table broadcasts(
  id bigserial primary key,
  author uuid references users,
  scope text,
  title text,
  body text,
  created_at timestamptz default now()
);

create table institutional_updates(
  id bigserial primary key,
  tag text,
  title text,
  body text,
  created_at timestamptz default now()
);

create table notifications(
  id bigserial primary key,
  user_id uuid references users,
  text text,
  created_at timestamptz default now()
);

create table read_status(
  user_id uuid references users,
  item_type text,
  item_id bigint,
  primary key(user_id,item_type,item_id)
);

create table schedule_requests(
  id bigserial primary key,
  from_id uuid references users,
  to_id uuid references users,
  schedule_id bigint,
  reason text,
  status text default 'pending'
);


create function is_faculty()
returns boolean
language sql
security definer
as $$
  select exists(
    select 1
    from users
    where id=auth.uid()
    and role='faculty'
  )
$$;


alter table users enable row level security;
alter table students enable row level security;
alter table faculty enable row level security;
alter table schedule enable row level security;
alter table tasks enable row level security;
alter table broadcasts enable row level security;
alter table institutional_updates enable row level security;
alter table notifications enable row level security;
alter table read_status enable row level security;
alter table schedule_requests enable row level security;


create policy "own profile"
on users
for select
using(id=auth.uid());


create policy "own student row"
on students
for select
using(
  user_id=auth.uid()
  or
  is_faculty()
);


create policy "faculty row"
on faculty
for select
using(
  user_id=auth.uid()
);


create policy "read schedule"
on schedule
for select
to authenticated
using(true);


create policy "faculty edits schedule"
on schedule
for all
using(is_faculty())
with check(is_faculty());


create policy "read tasks"
on tasks
for select
to authenticated
using(true);


create policy "faculty posts tasks"
on tasks
for insert
with check(is_faculty());


create policy "read broadcasts"
on broadcasts
for select
to authenticated
using(true);


create policy "faculty posts broadcasts"
on broadcasts
for insert
with check(is_faculty());


create policy "read updates"
on institutional_updates
for select
to authenticated
using(true);


create policy "own notifications"
on notifications
for all
using(user_id=auth.uid());


create policy "own read status"
on read_status
for all
using(user_id=auth.uid());


create policy "my swap requests"
on schedule_requests
for all
using(
  from_id=auth.uid()
  or
  to_id=auth.uid()
);

`;


/* =========================================================
   OPEN MESSAGE
========================================================= */

function openMsg(type, id) {

  const m =
    (
      type === 'upd'
        ? D.upd
        : D.bc
    ).find(
      x => x.id == id
    );


  if (!m) return;


  D.read.add(
    type === 'upd'
      ? 'u' + id
      : id
  );


  open(`

    <span
      class="chip ${
        type === 'upd'
          ? 'v'
          : 'y'
      }"
    >

      ${esc(
        type === 'upd'
          ? m.tag
          : m.scope
      )}

    </span>


    <h2>
      ${esc(m.title)}
    </h2>


    <p>
      ${esc(m.body)}
    </p>


    <div class="mut">
      ${esc(m.from || 'Institution')}
    </div>

  `);

}


/* =========================================================
   OPEN TASK
========================================================= */

function openTask(id) {

  const t =
    D.tasks.find(
      x => x.id == id
    );


  if (!t) return;


  open(`

    <span class="chip y">
      ${t.kind}
    </span>


    <h2>
      ${esc(t.title)}
    </h2>


    <p class="mut">

      ${esc(t.subj)}

      ·

      ${
        t.marks
          ? t.marks + ' marks'
          : 'No marks'
      }

      ·

      Due
      ${esc(t.due)}

    </p>


    ${
      t.done

        ? `

          <div class="card">

            <span class="chip g">
              Submitted
            </span>

            Your response is with the faculty.

          </div>

        `

        : `

          <form
            id="sf"
            data-id="${t.id}"
          >

            ${t.fields.map(field).join('')}

            <button>
              Submit
            </button>

          </form>

        `
    }

  `);

}


/* =========================================================
   REQUEST SWAP
========================================================= */

function openReq() {

  open(`

    <h2>
      Request a swap
    </h2>


    <form id="rf">

      <label>

        Class to swap

        <select id="rs">

          ${
            D.sched.map(
              s => `

                <option>
                  ${esc(s.subj)},
                  ${s.start}
                </option>

              `
            ).join('')
          }

        </select>

      </label>


      <label>

        With

        <select id="rt">

          <option>
            Prof. R. Kumar
          </option>

          <option>
            Dr. S. Nair
          </option>

        </select>

      </label>


      <label>

        Reason

        <input
          id="rr"
          required
        >

      </label>


      <button>
        Send request
      </button>

    </form>

  `);

}


/* =========================================================
   CLICK EVENTS
========================================================= */

document.addEventListener(
  'click',
  e => {

    const g =
      s => e.target.closest(s);

    let x;


    /* Demo login */

    if (
      x = g('[data-fill]')
    ) {

      $('#lid').value =
        x.dataset.fill;

      $('#lpw').value =
        'demo123';

    }


    /* Navigation */

    else if (
      x = g('[data-tab]')
    ) {

      tab =
        x.dataset.tab;

      filt = 'All';

      render();

    }


    /* Filters */

    else if (
      x = g('[data-filt]')
    ) {

      filt =
        x.dataset.filt;

      $('#view').innerHTML =
        VIEWS[
          me.role
        ][tab]();

    }


    /* Messages */

    else if (
      x = g('[data-msg]')
    ) {

      const [
        t,
        i
      ] =
        x.dataset.msg.split(':');


      openMsg(t, i);

    }


    /* Tasks */

    else if (
      x = g('[data-task]')
    ) {

      openTask(
        x.dataset.task
      );

    }


    /* Search result */

    else if (
      x = g('[data-hit]')
    ) {

      const [
        k,
        i
      ] =
        x.dataset.hit.split(':');


      q = '';

      $('#sr').innerHTML = '';

      if ($('#q')) {
        $('#q').value = '';
      }


      if (k === 'task') {

        openTask(i);

      } else {

        openMsg(k, i);

      }

    }


    /* Swap requests */

    else if (
      x = g('[data-req]')
    ) {

      const [
        i,
        s
      ] =
        x.dataset.req.split(':');


      const r =
        D.req.find(
          r => r.id == i
        );


      if (!r) return;


      r.status = s;


      log(
        `${
          s === 'accepted'
            ? 'Accepted'
            : 'Rejected'
        } swap request from ${r.from}`
      );


      toast(
        s === 'accepted'
          ? 'Swap accepted'
          : 'Swap rejected'
      );


      $('#view').innerHTML =
        VIEWS.faculty.swap();

    }


    /* Generic actions */

    else if (
      x = g('[data-act]')
    ) {

      const a =
        x.dataset.act;


      /* Close drawer */

      if (a === 'close') {

        closeDr();

      }


      /* Sign out */

      if (a === 'out') {

        me = null;

        loginView();

      }


      /* SQL */

      if (a === 'sql') {

        open(`

          <h2>
            Supabase setup
          </h2>


          <p class="mut">

            1. Run this in the SQL editor.

            <br>

            2. Add your URL and anon key
            to CONFIG at the top of the script.

          </p>


          <textarea
            rows="12"
            readonly
            style="font:12px monospace"
          >${esc(SQL)}</textarea>


          <button data-act="copy">
            Copy SQL
          </button>

        `);

      }


      /* Copy SQL */

      if (a === 'copy') {

        navigator.clipboard?.writeText(SQL);

        toast(
          'SQL copied'
        );

      }


      /* Mark all read */

      if (a === 'readall') {

        [
          ...D.bc.map(b => b.id),
          ...D.upd.map(u => 'u' + u.id)
        ].forEach(
          i => D.read.add(i)
        );


        toast(
          'All marked read'
        );


        render();

      }


      /* Clear notifications */

      if (a === 'clear') {

        D.notes = [];

        toast(
          'Notifications cleared'
        );


        render();

      }


      /* New swap */

      if (a === 'newreq') {

        openReq();

      }

    }


    /* Overlay */

    if (
      e.target.closest('#vl')
    ) {

      closeDr();

    }

  }
);


/* =========================================================
   FORM SUBMISSION
========================================================= */

document.addEventListener(
  'submit',
  async e => {

    const f =
      e.target;


    if (f.id === 'lf') {
      return;
    }


    e.preventDefault();


    /* =====================================================
       STUDENT TASK SUBMISSION
    ===================================================== */

    if (f.id === 'sf') {

      const task =
        D.tasks.find(
          t =>
            t.id ==
            f.dataset.id
        );


      if (task) {

        task.done = true;

      }


      closeDr();


      toast(
        'Submitted. Nice work!'
      );


      render();

    }


    /* =====================================================
       FACULTY BROADCAST
    ===================================================== */

    if (f.id === 'bf') {

      const b = {

        id: Date.now(),

        from: me.name,

        scope:
          $('#bs').value,

        title:
          $('#bt').value,

        body:
          $('#bm').value,

        time:
          'Just now'

      };


      D.bc.unshift(b);


      await save(
        'broadcasts',
        b
      );


      log(
        `Broadcast "${b.title}" to ${b.scope}`
      );


      toast(
        'Broadcast sent to ' +
        b.scope
      );


      $('#view').innerHTML =
        VIEWS.faculty.bcast();

    }


    /* =====================================================
       FACULTY TASK
    ===================================================== */

    if (f.id === 'tf') {

      const t = {

        id: Date.now(),

        title:
          $('#tt').value,

        subj:
          'DBMS',

        due:
          'Next week',

        marks:
          +$('#tm').value,

        kind:
          $('#tk').value,

        fields:
          $('#tfl').value
            .split(',')
            .map(
              s => s.trim()
            )
            .filter(Boolean),

        done: false

      };


      D.tasks.unshift(t);


      await save(
        'tasks',
        t
      );


      D.notes.unshift({

        id: t.id,

        text:
          `New ${t.kind}: ${t.title}`,

        time:
          'now'

      });


      log(
        `Published ${t.kind} "${t.title}"`
      );


      toast(
        'Task published'
      );


      $('#view').innerHTML =
        VIEWS.faculty.tasks();

    }


    /* =====================================================
       SCHEDULE EDIT
    ===================================================== */

    if (f.id === 'ef') {

      const s =
        D.sched.find(
          x =>
            x.id ==
            $('#es').value
        );


      if (!s) return;


      const c =
        $('#ec').value;

      const v =
        $('#ev').value;


      s.status = c;


      if (
        c === 'Room changed' &&
        v
      ) {

        s.room = v;

      }


      if (
        c === 'Moved' &&
        v
      ) {

        s.start = v;

        s.end =
          (
            Number(
              v.slice(0, 2)
            ) + 1
          )
          .toString()
          .padStart(2, '0')
          +
          v.slice(2);

      }


      D.notes.unshift({

        id: Date.now(),

        text:
          `${s.subj}: ${c.toLowerCase()}${
            v
              ? ' → ' + v
              : ''
          }`,

        time:
          'now'

      });


      log(
        `Schedule change: ${s.subj} (${c})`
      );


      toast(
        `Published to ${s.sec} students`
      );

    }


    /* =====================================================
       FACULTY SWAP REQUEST
    ===================================================== */

    if (f.id === 'rf') {

      D.req.unshift({

        id: Date.now(),

        from: me.name,

        to:
          $('#rt').value,

        slot:
          $('#rs').value,

        reason:
          $('#rr').value,

        status:
          'pending',

        mine:
          true

      });


      log(
        'Requested a swap with ' +
        $('#rt').value
      );


      closeDr();


      toast(
        'Request sent'
      );


      $('#view').innerHTML =
        VIEWS.faculty.swap();

    }

  }
);


/* =========================================================
   START APPLICATION
========================================================= */

loginView();