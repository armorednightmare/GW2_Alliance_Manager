export type Language = "de" | "en";

export const translations = {
  de: {
    // Header
    loggedInAs: "Eingeloggt als",
    logout: "Logout",
    login: "Login",
    openNav: "Navigation öffnen",
    closeNav: "Navigation schließen",

    // Sidebar
    dashboard: "Dashboard",
    members: "Mitglieder",
    guilds: "Gilden",
    history: "Historie",
    admin: "Admin",
    profile: "Profil",

    // Dashboard
    dashboardTitle: "Dashboard",
    membersCount: "Mitglieder",
    guildsCount: "Gilden",
    wvwAlarm: "WvW Alarm",
    wvwAlarmDesc: "Folgende Spieler sind aktuell in der Allianzgilde, haben diese aber nicht als Kampfgilde markiert.",
    allWvwOk: "Alle aktiven Spieler haben die WvW-Gilde ausgewählt! 🎉",
    recentActivity: "Letzte Aktivitäten",

    // Members page
    membersTitle: "Mitgliederübersicht",
    membersSubtitleAdmin: " Sie sehen Allianzmitglieder sowie Mitglieder Ihrer eigenen Gilde.",
    membersSubtitleAllianceLeader: " Sie sehen Allianzmitglieder sowie Mitglieder, die die Gilde verlassen haben.",
    membersSubtitleDefault: " Die Ansicht ist auf offizielle Allianzmitglieder beschränkt.",
    membersIntro: "Hier sehen Sie alle Mitglieder, Gildenfreunde und Ausgetretene der verknüpften Gilden.",
    searchPlaceholder: "Suchen nach Account, Gilde, Rang...",
    allStatuses: "Alle Status",
    onlyActive: "Nur Aktive",
    onlyInactive: "Nur Inaktive (Verlassen/Gekickt)",
    allGuilds: "Alle Gilden",
    playersFiltered: "Spieler gefiltert",
    playersTotal: "Spieler gesamt",
    columnAccount: "Account",
    columnStatus: "Status",
    columnGuilds: "Gilden (+ Ränge)",
    columnWvw: "WvW Vertreten",
    columnAlliance: "Allianz",
    columnRoles: "Rollen",
    columnActions: "Aktionen",
    details: "Details",
    noMembersFound: "Keine entsprechenden Mitglieder gefunden.",

    // Guilds page
    guildsTitle: "Gildenübersicht",
    guildsSubtitle: "Hier sehen Sie alle verknüpften Gilden und ihre aktiven Mitglieder.",
    searchGuilds: "Suchen nach Name, Tag...",
    guildsFiltered: "Gilden gefiltert",
    guildsTotal: "Gilden gesamt",
    columnGuild: "Gilde",
    columnSyncStatus: "Sync-Status",
    columnMembers: "Mitglieder",
    columnWvwActive: "WvW Vertreten",
    columnShare: "Anteil (WvW)",
    syncOk: "✅ API-Key hinterlegt",
    syncMissing: "❌ Kein API-Key",
    wvwDistribution: "WvW-Verteilung",
    noGuildsFound: "Keine entsprechenden Gilden gefunden.",

    // History page
    historyTitle: "Allianz Historie",
    historySubtitle: "Hier sehen Sie die Aktivitäten aller Mitglieder (Beitritte, Austritte, Änderungen des WvW-Status).",
    searchHistory: "Suchen nach Account, Ereignis...",
    entriesFound: "Einträge gefunden",
    loading: "Lädt...",
    searching: "Suche läuft...",
    noHistoryFound: "Keine Historien-Einträge gefunden.",
    columnDate: "Datum",
    columnEvent: "Ereignis",
    columnDetails: "Details",
    prevPage: "Vorherige",
    nextPage: "Nächste",
    pageSuffix: "pro Seite",
    pageOf: "von",
    page: "Seite",

    // Member profile
    wvwStatus: "WvW Vertreten",
    yes: "Ja",
    no: "Nein",

    // Admin
    adminTitle: "Administration",

    // General
    unknown: "Unbekannt",
    save: "Speichern",
    cancel: "Abbrechen",
    delete: "Löschen",
    edit: "Bearbeiten",
    add: "Hinzufügen",
    confirm: "Bestätigen",
    error: "Ein Fehler ist aufgetreten!",
    retry: "Erneut versuchen",
  },
  en: {
    // Header
    loggedInAs: "Logged in as",
    logout: "Logout",
    login: "Login",
    openNav: "Open navigation",
    closeNav: "Close navigation",

    // Sidebar
    dashboard: "Dashboard",
    members: "Members",
    guilds: "Guilds",
    history: "History",
    admin: "Admin",
    profile: "Profile",

    // Dashboard
    dashboardTitle: "Dashboard",
    membersCount: "Members",
    guildsCount: "Guilds",
    wvwAlarm: "WvW Alarm",
    wvwAlarmDesc: "The following players are in the alliance guild but have not set it as their combat guild.",
    allWvwOk: "All active players have selected the WvW guild! 🎉",
    recentActivity: "Recent Activity",

    // Members page
    membersTitle: "Member Overview",
    membersSubtitleAdmin: " You can see alliance members and members of your own guild.",
    membersSubtitleAllianceLeader: " You can see alliance members and members who have left the guild.",
    membersSubtitleDefault: " The view is limited to official alliance members.",
    membersIntro: "Here you can see all members, guild friends, and former members of the linked guilds.",
    searchPlaceholder: "Search by account, guild, rank...",
    allStatuses: "All Statuses",
    onlyActive: "Active only",
    onlyInactive: "Inactive only (Left/Kicked)",
    allGuilds: "All Guilds",
    playersFiltered: "players filtered",
    playersTotal: "players total",
    columnAccount: "Account",
    columnStatus: "Status",
    columnGuilds: "Guilds (+ Ranks)",
    columnWvw: "WvW Representing",
    columnAlliance: "Alliance",
    columnRoles: "Roles",
    columnActions: "Actions",
    details: "Details",
    noMembersFound: "No matching members found.",

    // Guilds page
    guildsTitle: "Guild Overview",
    guildsSubtitle: "Here you can see all linked guilds and their active members.",
    searchGuilds: "Search by name, tag...",
    guildsFiltered: "guilds filtered",
    guildsTotal: "guilds total",
    columnGuild: "Guild",
    columnSyncStatus: "Sync Status",
    columnMembers: "Members",
    columnWvwActive: "WvW Representing",
    columnShare: "Share (WvW)",
    syncOk: "✅ API key configured",
    syncMissing: "❌ No API key",
    wvwDistribution: "WvW Distribution",
    noGuildsFound: "No matching guilds found.",

    // History page
    historyTitle: "Alliance History",
    historySubtitle: "Here you can see all member activities (joins, leaves, WvW status changes).",
    searchHistory: "Search by account, event...",
    entriesFound: "entries found",
    loading: "Loading...",
    searching: "Searching...",
    noHistoryFound: "No history entries found.",
    columnDate: "Date",
    columnEvent: "Event",
    columnDetails: "Details",
    prevPage: "Previous",
    nextPage: "Next",
    pageSuffix: "per page",
    pageOf: "of",
    page: "Page",

    // Member profile
    wvwStatus: "WvW Representing",
    yes: "Yes",
    no: "No",

    // Admin
    adminTitle: "Administration",

    // General
    unknown: "Unknown",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    confirm: "Confirm",
    error: "An error occurred!",
    retry: "Try again",
  },
} as const;

export type TranslationKey = keyof typeof translations.de;
