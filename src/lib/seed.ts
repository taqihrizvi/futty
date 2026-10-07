import type { AppState, Match, Player, Team } from "./types";

function dayOffsetFromDate(dateStr: string) {
  const target = new Date(`${dateStr}T12:00:00`);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((startTarget.getTime() - startToday.getTime()) / 86400000);
}

const CUP = "tour_csl";
const GROUP_DAY = "2026-10-10";
const FINAL_DAY = "2026-10-17";

const TEAMS: Team[] = [
  { id: "t_avengers", name: "Andromeda Avengers", city: "" },
  { id: "t_lions", name: "Perseus Lions", city: "" },
  { id: "t_ds", name: "DS United", city: "" },
  { id: "t_dragons", name: "Harris Dragons", city: "" },
  { id: "t_warriors", name: "Jonas Warriors", city: "" },
  { id: "t_jaguars", name: "Jonas Jaguars", city: "" },
];

const SQUADS: Record<string, string[]> = {
  t_avengers: [
    "Nadir Mehmood (C)",
    "Adeel Zahoor",
    "Zeeshan Maqsood",
    "Hamza Iftikhar Abbasi",
    "SYED SALMAN ABBAS",
    "Danial Ehtisham Shafqat",
    "Muhammad Sibtain ul Hassan",
    "Fahad Kalim",
    "Muhammad Wasim",
    "Tauseeq Mir",
  ],
  t_lions: [
    "Muhammad Umer (C)",
    "Zain Abbas",
    "Haris Waheed",
    "Wajahat Khurshid",
    "Muddassar Latif",
    "Numan Mirza",
    "Muhammad Khizar Shaheen",
    "Usman Khalid",
    "Muhammad Shahzaib",
    "Fawad Abbas",
  ],
  t_ds: [
    "Agha Moiz Syed (C)",
    "Sheheryaar Afzal",
    "Muhammad Kamran",
    "Irfan Haider",
    "Uzair Umar",
    "Muhammad Ali Janjua",
    "Muhammad Ehtishaam Tanveer",
    "Ramil Ahmad",
    "Muhammad Safyan",
    "Ikram Khan",
  ],
  t_dragons: [
    "Hamza Khalil (C)",
    "Umair Mirza",
    "Faizan Shoukat Abbasi",
    "Muhammad Aune Abbas",
    "Majeed Khan",
    "Usama Ali Qadri",
    "Nabeel Ahmed",
    "Syed Abdullah",
    "Asad Mukhtar",
    "Hussain Riaz",
  ],
  t_warriors: [
    "Hasnain Tahir (C)",
    "Hamza Saeed",
    "Malik Saifal Raza Khan",
    "Abdul Rehman",
    "Saad Saleem",
    "Kashif Naeem",
    "Muhammad Maaz Khan",
    "Muhammad Adnan",
    "Muhammad Qasim",
    "Abdul Hadi",
  ],
  t_jaguars: [
    "Syed Muhammad Taqi Hurr (C)",
    "Mubasshar Abbasi",
    "Abdullah Khalid",
    "Nasir Hussain",
    "Adeel Tariq",
    "Ammad Javed",
    "Usama Bin Shafique",
    "Tayyb Iltaf",
    "Hammad Shahid",
    "Hassaan Ahmad",
  ],
};

function playersFor(teamId: string): Player[] {
  return SQUADS[teamId].map((name, index) => ({
    id: `${teamId}_n${index + 1}`,
    teamId,
    name,
    number: index + 1,
    position: null,
  }));
}

function fixture(
  partial: Pick<Match, "id" | "stage" | "time"> &
    Partial<
      Pick<
        Match,
        | "groupId"
        | "round"
        | "homeTeamId"
        | "awayTeamId"
        | "homeLabel"
        | "awayLabel"
        | "homeFromMatchId"
        | "awayFromMatchId"
        | "dayOffset"
      >
    >,
): Match {
  return {
    tournamentId: CUP,
    status: "scheduled",
    venue: "CSL Court",
    homeTeamId: null,
    awayTeamId: null,
    homeScore: 0,
    awayScore: 0,
    clockSeconds: 0,
    clockRunning: false,
    clockAnchor: null,
    period: 1,
    onBreak: false,
    dayOffset: partial.dayOffset ?? dayOffsetFromDate(GROUP_DAY),
    ...partial,
  };
}

export function createSeed(): AppState {
  const finalDay = dayOffsetFromDate(FINAL_DAY);
  return {
    tournaments: [
      {
        id: CUP,
        slug: "csl-2026",
        name: "CSL 2026",
        city: "",
        venue: "CSL Court",
        format: "5v5",
        startLabel: "10 Oct 2026",
        endLabel: "17 Oct 2026",
        qualifyPerGroup: 2,
        teamIds: TEAMS.map((team) => team.id),
        groups: [
          {
            id: "g_a",
            name: "Group A",
            teamIds: ["t_lions", "t_jaguars", "t_dragons"],
          },
          {
            id: "g_b",
            name: "Group B",
            teamIds: ["t_avengers", "t_ds", "t_warriors"],
          },
        ],
        knockoutRounds: ["semi-final", "final"],
      },
    ],
    teams: TEAMS.map((team) => ({ ...team })),
    players: TEAMS.flatMap((team) => playersFor(team.id)),
    matches: [
      fixture({
        id: "m_1",
        stage: "group",
        groupId: "g_a",
        time: "18:15",
        homeTeamId: "t_lions",
        awayTeamId: "t_jaguars",
      }),
      fixture({
        id: "m_2",
        stage: "group",
        groupId: "g_b",
        time: "19:00",
        homeTeamId: "t_avengers",
        awayTeamId: "t_ds",
      }),
      fixture({
        id: "m_3",
        stage: "group",
        groupId: "g_a",
        time: "19:45",
        homeTeamId: "t_lions",
        awayTeamId: "t_dragons",
      }),
      fixture({
        id: "m_4",
        stage: "group",
        groupId: "g_b",
        time: "20:30",
        homeTeamId: "t_avengers",
        awayTeamId: "t_warriors",
      }),
      fixture({
        id: "m_5",
        stage: "group",
        groupId: "g_a",
        time: "21:15",
        homeTeamId: "t_jaguars",
        awayTeamId: "t_dragons",
      }),
      fixture({
        id: "m_6",
        stage: "group",
        groupId: "g_b",
        time: "22:00",
        homeTeamId: "t_ds",
        awayTeamId: "t_warriors",
      }),
      fixture({
        id: "m_sf1",
        stage: "knockout",
        round: "semi-final",
        time: "18:30",
        dayOffset: finalDay,
        homeLabel: "Group A #1",
        awayLabel: "Group B #2",
      }),
      fixture({
        id: "m_sf2",
        stage: "knockout",
        round: "semi-final",
        time: "19:30",
        dayOffset: finalDay,
        homeLabel: "Group B #1",
        awayLabel: "Group A #2",
      }),
      fixture({
        id: "m_final",
        stage: "knockout",
        round: "final",
        time: "20:30",
        dayOffset: finalDay,
        homeFromMatchId: "m_sf1",
        awayFromMatchId: "m_sf2",
      }),
    ],
    events: [],
    myTeamId: null,
  };
}

export const STORAGE_KEY = "futty-state-v1";
