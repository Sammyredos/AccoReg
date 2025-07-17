/**
 * LIGHTWEIGHT i18n System - Performance Optimized
 * - Minimal bundle impact
 * - Smart caching
 * - No external dependencies
 */

export type Language = 'en' | 'fr' | 'es' | 'ha' | 'ig' | 'yo'

const STORAGE_KEY = 'mopgomglobal-lang'

// Comprehensive translations for the entire application
const coreTranslations: Record<Language, Record<string, string>> = {
  en: {
    // Common actions
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.loading': 'Loading...',
    'common.signOut': 'Sign Out',
    'common.search': 'Search',
    'common.export': 'Export',
    'common.view': 'View',
    'common.send': 'Send',
    'common.create': 'Create',
    'common.update': 'Update',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.ok': 'OK',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Info',
    'common.refresh': 'Refresh',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.submit': 'Submit',
    'common.reset': 'Reset',
    'common.clear': 'Clear',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.download': 'Download',
    'common.upload': 'Upload',
    'common.print': 'Print',
    'common.share': 'Share',
    'common.copy': 'Copy',
    'common.paste': 'Paste',
    'common.cut': 'Cut',
    'common.select': 'Select',
    'common.selectAll': 'Select All',
    'common.none': 'None',
    'common.all': 'All',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.online': 'Online',
    'common.offline': 'Offline',
    'common.checking': 'Checking...',
    'common.notConfigured': 'Not Configured',
    'common.justNow': 'Just now',
    'common.minutesAgo': '{count} minutes ago',
    'common.hoursAgo': '{count} hours ago',
    'common.daysAgo': '{count} days ago',
    'common.noSubject': 'No subject',
    'common.failed': 'Failed',
    'common.sent': 'Sent',
    'common.delivered': 'Delivered',
    'common.pending': 'Pending',

    // Status messages
    'status.checking': 'Checking...',
    'status.online': 'Online',
    'status.offline': 'Offline',
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.notConfigured': 'Not Configured',
    'status.error': 'Error',
    'status.sent': 'Sent',
    'status.delivered': 'Delivered',
    'status.failed': 'Failed',
    'status.pending': 'Pending',

    // Time formats
    'time.justNow': 'Just now',
    'time.minutesAgo': '{count} minutes ago',
    'time.hoursAgo': '{count} hours ago',
    'time.daysAgo': '{count} days ago',
    'time.hourAgo': '1 hour ago',

    // Error messages
    'error.failedToFetch': 'Failed to fetch {resource}',
    'error.failedToLoad': 'Failed to load {resource}',
    'error.failedToSave': 'Failed to save {resource}',
    'error.failedToDelete': 'Failed to delete {resource}',
    'error.networkError': 'Network error occurred',
    'error.serverError': 'Server error occurred',
    'error.unknownError': 'An unknown error occurred',

    // Empty states
    'empty.noData': 'No data available',
    'empty.noResults': 'No results found',
    'empty.noUsers': 'No users found',
    'empty.noRegistrations': 'No registrations found',
    'empty.noMessages': 'No messages found',
    'empty.noReports': 'No reports available',
    'empty.noNotifications': 'No notifications',
    'empty.noCommunications': 'No recent communications',

    // Actions
    'action.viewAll': 'View All {resource}',
    'action.viewAllRegistrations': 'View All Registrations',
    'action.analyticsReports': 'Analytics & Reports',
    'action.communications': 'Communications',
    'action.registrationForm': 'Registration Form',
    'action.shareRegistrationLink': 'Share Registration Link',
    'action.addUser': 'Add User',
    'action.generateReport': 'Generate Report',
    'action.quickActions': 'Quick Actions',
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.registrations': 'Registrations',
    'nav.attendance': 'Attendance Verification',
    'nav.communications': 'Communications',
    'nav.accommodations': 'Accommodations',
    'nav.inbox': 'Inbox',
    'nav.analytics': 'Analytics',
    'nav.reports': 'Reports',
    'nav.notifications': 'Notifications',
    'nav.userManagement': 'User Management',

    'nav.settings': 'Settings',

    // Dashboard specific
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.systemStatus': 'System Status',
    'dashboard.communications': 'Recent Communications',
    'dashboard.database': 'Database',
    'dashboard.emailService': 'Email Service',
    'dashboard.smsService': 'SMS Service',
    'dashboard.newRegistration': 'New registration: {name}',
    'dashboard.systemHealthCheckCompleted': 'System health check completed',
    'dashboard.welcomeEmailsSent': 'Welcome emails sent to {count} new registrants',
    'dashboard.registrationConfirmationBatchProcessed': 'Registration confirmation batch processed',
    'dashboard.systemNotificationDatabaseBackupCompleted': 'System notification: Database backup completed',
    'dashboard.minutesAgo': '{count} minutes ago',
    'dashboard.hourAgo': '1 hour ago',
    'dashboard.hoursAgo': '{count} hours ago',
    'dashboard.online': 'Online',
    'dashboard.offline': 'Offline',
    'dashboard.inactive': 'Inactive',
    'dashboard.error': 'Error',
    'dashboard.checking': 'Checking...',
    'dashboard.active': 'Active',
    'dashboard.notConfigured': 'Not Configured',
    'dashboard.fromTo': 'From: {sender} → To: {recipient}',
    'settings.language': 'Language',
    'settings.branding': 'System Branding',
    'admin.panel': 'Admin Panel',

    // Page titles and descriptions
    'page.registrations.title': 'Registration Management',
    'page.registrations.description': 'View and manage accommodation registrations',
    'page.dashboard.title': 'Dashboard',
    'page.dashboard.description': 'Overview of system activity and statistics',
    'page.accommodations.title': 'Accommodations',
    'page.accommodations.description': 'Manage room allocations and housing arrangements',
    'page.communications.title': 'Communications',
    'page.communications.description': 'Manage participant communications and contact information',
    'page.inbox.title': 'Messages',
    'page.inbox.description': 'Messaging Interface',
    'page.analytics.title': 'Analytics',
    'page.analytics.description': 'Registration trends and accommodation insights',
    'page.reports.title': 'Reports',
    'page.reports.description': 'Generate and download accommodation reports',
    'page.notifications.title': 'Notifications',
    'page.notifications.description': 'Stay updated with system alerts and important messages',
    'page.users.title': 'User Management',
    'page.users.description': 'Manage admin users and permissions',
    'page.settings.title': 'Settings',
    'page.settings.description': 'Configure system settings and preferences',

    // Additional dashboard translations - non-duplicates only
    'dashboard.totalRegistrations': 'Total Registrations',
    'dashboard.newThisMonth': 'New This Month',
    'dashboard.completionRate': 'Completion Rate',
    'dashboard.recentRegistrations': 'Recent Registrations',
    'dashboard.allTimeRegistrations': 'All time registrations',
    'dashboard.recentRegistrationsText': 'Recent registrations',
    'dashboard.successfullyCompleted': 'Successfully completed',
    'dashboard.last24Hours': 'Last 24 hours',
    'dashboard.noChange': 'No change',
    'dashboard.vsLastMonth': 'vs last month',
    'dashboard.latestParticipantSignUps': 'Latest participant sign-ups',
    'dashboard.viewAll': 'View All'
  },
  fr: {
    // Common actions
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.edit': 'Modifier',
    'common.delete': 'Supprimer',
    'common.loading': 'Chargement...',
    'common.signOut': 'Se déconnecter',
    'common.search': 'Rechercher',
    'common.export': 'Exporter',
    'common.view': 'Voir',
    'common.send': 'Envoyer',
    'common.create': 'Créer',
    'common.update': 'Mettre à jour',
    'common.close': 'Fermer',
    'common.confirm': 'Confirmer',
    'common.yes': 'Oui',
    'common.no': 'Non',
    'common.ok': 'OK',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.warning': 'Avertissement',
    'common.info': 'Info',
    'common.refresh': 'Actualiser',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.previous': 'Précédent',
    'common.submit': 'Soumettre',
    'common.reset': 'Réinitialiser',
    'common.clear': 'Effacer',
    'common.filter': 'Filtrer',
    'common.sort': 'Trier',
    'common.download': 'Télécharger',
    'common.upload': 'Téléverser',
    'common.print': 'Imprimer',
    'common.share': 'Partager',
    'common.copy': 'Copier',
    'common.paste': 'Coller',
    'common.cut': 'Couper',
    'common.select': 'Sélectionner',
    'common.selectAll': 'Tout sélectionner',
    'common.none': 'Aucun',
    'common.all': 'Tout',
    'common.active': 'Actif',
    'common.inactive': 'Inactif',
    'common.online': 'En ligne',
    'common.offline': 'Hors ligne',
    'common.checking': 'Vérification...',
    'common.notConfigured': 'Non configuré',
    'common.justNow': 'À l\'instant',
    'common.minutesAgo': 'Il y a {count} minutes',
    'common.hoursAgo': 'Il y a {count} heures',
    'common.daysAgo': 'Il y a {count} jours',
    'common.noSubject': 'Aucun sujet',
    'common.failed': 'Échec',
    'common.sent': 'Envoyé',
    'common.delivered': 'Livré',
    'common.pending': 'En attente',

    // Status messages
    'status.checking': 'Vérification...',
    'status.online': 'En ligne',
    'status.offline': 'Hors ligne',
    'status.active': 'Actif',
    'status.inactive': 'Inactif',
    'status.notConfigured': 'Non configuré',
    'status.error': 'Erreur',
    'status.sent': 'Envoyé',
    'status.delivered': 'Livré',
    'status.failed': 'Échec',
    'status.pending': 'En attente',

    // Time formats
    'time.justNow': 'À l\'instant',
    'time.minutesAgo': 'Il y a {count} minutes',
    'time.hoursAgo': 'Il y a {count} heures',
    'time.daysAgo': 'Il y a {count} jours',
    'time.hourAgo': 'Il y a 1 heure',

    // Error messages
    'error.failedToFetch': 'Échec de récupération de {resource}',
    'error.failedToLoad': 'Échec de chargement de {resource}',
    'error.failedToSave': 'Échec de sauvegarde de {resource}',
    'error.failedToDelete': 'Échec de suppression de {resource}',
    'error.networkError': 'Erreur réseau',
    'error.serverError': 'Erreur serveur',
    'error.unknownError': 'Erreur inconnue',

    // Empty states
    'empty.noData': 'Aucune donnée disponible',
    'empty.noResults': 'Aucun résultat trouvé',
    'empty.noUsers': 'Aucun utilisateur trouvé',
    'empty.noRegistrations': 'Aucune inscription trouvée',
    'empty.noMessages': 'Aucun message trouvé',
    'empty.noReports': 'Aucun rapport disponible',
    'empty.noNotifications': 'Aucune notification',
    'empty.noCommunications': 'Aucune communication récente',

    // Actions
    'action.viewAll': 'Voir tout {resource}',
    'action.viewAllRegistrations': 'Voir toutes les inscriptions',
    'action.analyticsReports': 'Analyses et rapports',
    'action.communications': 'Communications',
    'action.registrationForm': 'Formulaire d\'inscription',
    'action.shareRegistrationLink': 'Partager le lien d\'inscription',
    'action.addUser': 'Ajouter un utilisateur',
    'action.generateReport': 'Générer un rapport',
    'action.quickActions': 'Actions rapides',
    // Navigation
    'nav.dashboard': 'Tableau de bord',
    'nav.registrations': 'Inscriptions',
    'nav.attendance': 'Vérification de Présence',
    'nav.communications': 'Communications',
    'nav.accommodations': 'Hébergements',
    'nav.inbox': 'Boîte de réception',
    'nav.analytics': 'Analyses',
    'nav.reports': 'Rapports',
    'nav.notifications': 'Notifications',
    'nav.userManagement': 'Gestion des utilisateurs',

    'nav.settings': 'Paramètres',

    // Dashboard specific
    'dashboard.recentActivity': 'Activité récente',
    'dashboard.systemStatus': 'État du système',
    'dashboard.communications': 'Communications récentes',
    'dashboard.database': 'Base de données',
    'dashboard.emailService': 'Service email',
    'dashboard.smsService': 'Service SMS',
    'dashboard.newRegistration': 'Nouvelle inscription : {name}',
    'dashboard.systemHealthCheckCompleted': 'Vérification de l\'état du système terminée',
    'dashboard.welcomeEmailsSent': 'Emails de bienvenue envoyés à {count} nouveaux inscrits',
    'dashboard.registrationConfirmationBatchProcessed': 'Lot de confirmations d\'inscription traité',
    'dashboard.systemNotificationDatabaseBackupCompleted': 'Notification système : Sauvegarde de la base de données terminée',
    'dashboard.minutesAgo': 'Il y a {count} minutes',
    'dashboard.hourAgo': 'Il y a 1 heure',
    'dashboard.hoursAgo': 'Il y a {count} heures',
    'dashboard.online': 'En ligne',
    'dashboard.offline': 'Hors ligne',
    'dashboard.inactive': 'Inactif',
    'dashboard.error': 'Erreur',
    'dashboard.checking': 'Vérification...',
    'dashboard.active': 'Actif',
    'dashboard.notConfigured': 'Non configuré',
    'dashboard.fromTo': 'De : {sender} → À : {recipient}',
    'settings.language': 'Langue',
    'settings.branding': 'Image de marque',
    'admin.panel': 'Panneau d\'administration',

    // Page titles and descriptions
    'page.registrations.title': 'Gestion des inscriptions',
    'page.registrations.description': 'Voir et gérer les inscriptions d\'hébergement',
    'page.dashboard.title': 'Tableau de bord',
    'page.dashboard.description': 'Aperçu de l\'activité du système et des statistiques',
    'page.accommodations.title': 'Hébergements',
    'page.accommodations.description': 'Gérer les allocations de chambres et les arrangements d\'hébergement',
    'page.communications.title': 'Communications',
    'page.communications.description': 'Gérer les communications et informations de contact des participants',
    'page.inbox.title': 'Messages',
    'page.inbox.description': 'Interface de messagerie',
    'page.analytics.title': 'Analyses',
    'page.analytics.description': 'Tendances d\'inscription et aperçus du programme',
    'page.reports.title': 'Rapports',
    'page.reports.description': 'Générer et télécharger les rapports du programme',
    'page.notifications.title': 'Notifications',
    'page.notifications.description': 'Restez informé des alertes système et messages importants',
    'page.users.title': 'Gestion des utilisateurs',
    'page.users.description': 'Gérer les utilisateurs administrateurs et les permissions',
    'page.settings.title': 'Paramètres',
    'page.settings.description': 'Configurer les paramètres et préférences du système',

    // Additional dashboard translations (French) - non-duplicates only
    'dashboard.totalRegistrations': 'Total des Inscriptions',
    'dashboard.newThisMonth': 'Nouveaux ce Mois',
    'dashboard.completionRate': 'Taux de Completion',
    'dashboard.recentRegistrations': 'Inscriptions Récentes',
    'dashboard.allTimeRegistrations': 'Toutes les inscriptions',
    'dashboard.recentRegistrationsText': 'Inscriptions récentes',
    'dashboard.successfullyCompleted': 'Complété avec succès',
    'dashboard.last24Hours': 'Dernières 24 heures',
    'dashboard.noChange': 'Aucun changement',
    'dashboard.vsLastMonth': 'vs le mois dernier',
    'dashboard.latestParticipantSignUps': 'Dernières inscriptions de participants',
    'dashboard.viewAll': 'Voir Tout'
  },
  es: {
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.edit': 'Editar',
    'common.delete': 'Eliminar',
    'common.loading': 'Cargando...',
    'common.signOut': 'Cerrar sesión',
    'common.search': 'Buscar',
    'common.export': 'Exportar',
    'common.view': 'Ver',
    'common.send': 'Enviar',
    'nav.dashboard': 'Panel',
    'nav.registrations': 'Registros',
    'nav.attendance': 'Verificación de Asistencia',
    'nav.communications': 'Comunicaciones',
    'nav.accommodations': 'Alojamientos',
    'nav.inbox': 'Bandeja de entrada',
    'nav.analytics': 'Análisis',
    'nav.reports': 'Informes',
    'nav.notifications': 'Notificaciones',
    'nav.userManagement': 'Gestión de usuarios',

    'nav.settings': 'Configuración',
    'settings.language': 'Idioma',
    'settings.branding': 'Marca del sistema',
    'admin.panel': 'Panel de administración',

    // Time translations
    'time.justNow': 'Ahora mismo',
    'time.minutesAgo': 'Hace {count} minutos',
    'time.hoursAgo': 'Hace {count} horas',
    'time.daysAgo': 'Hace {count} días',
    'time.hourAgo': 'Hace 1 hora',

    // Status translations
    'status.checking': 'Verificando...',
    'status.online': 'En línea',
    'status.offline': 'Fuera de línea',
    'status.active': 'Activo',
    'status.inactive': 'Inactivo',
    'status.error': 'Error',
    'status.notConfigured': 'No configurado',

    // Common phrases
    'common.noSubject': 'Sin asunto',
    'page.registrations.title': 'Gestión de registros',
    'page.registrations.description': 'Ver y gestionar registros de alojamiento',
    'page.dashboard.title': 'Panel',
    'page.dashboard.description': 'Resumen de actividad del sistema y estadísticas',
    'page.accommodations.title': 'Alojamientos',
    'page.accommodations.description': 'Gestionar asignaciones de habitaciones y arreglos de alojamiento',
    'page.communications.title': 'Comunicaciones',
    'page.communications.description': 'Gestionar comunicaciones e información de contacto de participantes',
    'page.inbox.title': 'Mensajes',
    'page.inbox.description': 'Interfaz de mensajería',
    'page.analytics.title': 'Análisis',
    'page.analytics.description': 'Tendencias de registro y perspectivas del programa',
    'page.reports.title': 'Informes',
    'page.reports.description': 'Generar y descargar informes del programa',
    'page.notifications.title': 'Notificaciones',
    'page.notifications.description': 'Manténgase actualizado con alertas del sistema y mensajes importantes',
    'page.users.title': 'Gestión de usuarios',
    'page.users.description': 'Gestionar usuarios administradores y permisos',
    'page.settings.title': 'Configuración',
    'page.settings.description': 'Configurar ajustes y preferencias del sistema',
    'dashboard.totalRegistrations': 'Total de Registros',
    'dashboard.newThisMonth': 'Nuevos este Mes',
    'dashboard.completionRate': 'Tasa de Finalización',
    'dashboard.recentActivity': 'Actividad Reciente',
    'dashboard.systemStatus': 'Estado del Sistema',
    'dashboard.recentRegistrations': 'Registros Recientes',
    'dashboard.communications': 'Comunicaciones',
    'dashboard.allTimeRegistrations': 'Todos los registros',
    'dashboard.recentRegistrationsText': 'Registros recientes',
    'dashboard.successfullyCompleted': 'Completado exitosamente',
    'dashboard.last24Hours': 'Últimas 24 horas',
    'dashboard.noChange': 'Sin cambios',
    'dashboard.vsLastMonth': 'vs el mes pasado',
    'dashboard.database': 'Base de Datos',
    'dashboard.emailService': 'Servicio de Email',
    'dashboard.smsService': 'Servicio SMS',
    'dashboard.online': 'En Línea',
    'dashboard.error': 'Error',
    'dashboard.inactive': 'Inactivo',
    'dashboard.latestParticipantSignUps': 'Últimas inscripciones de participantes',
    'dashboard.viewAll': 'Ver Todo',
    'dashboard.systemHealthCheckCompleted': 'Verificación de salud del sistema completada',
    'dashboard.hourAgo': 'hace una hora',
    'dashboard.hoursAgo': 'hace {count} horas',
    'dashboard.minutesAgo': 'hace {count} minutos',
    'dashboard.welcomeEmailsSent': 'Emails de bienvenida enviados a {count} nuevos registrados',
    'dashboard.registrationConfirmationBatchProcessed': 'Lote de confirmación de registro procesado',
    'dashboard.systemNotificationDatabaseBackupCompleted': 'Notificación del sistema: Respaldo de base de datos completado'
  },
  ha: {
    'common.save': 'Ajiye',
    'common.cancel': 'Soke',
    'common.edit': 'Gyara',
    'common.delete': 'Share',
    'common.loading': 'Ana lodi...',
    'common.signOut': 'Fita',
    'common.search': 'Nema',
    'common.export': 'Fitar',
    'common.view': 'Duba',
    'common.send': 'Aika',
    'nav.dashboard': 'Dashboard',
    'nav.registrations': 'Rajista',
    'nav.attendance': 'Tabbatar da Halarta',
    'nav.communications': 'Sadarwa',
    'nav.accommodations': 'Masauki',
    'nav.inbox': 'Akwatin saƙo',
    'nav.analytics': 'Bincike',
    'nav.reports': 'Rahotanni',
    'nav.notifications': 'Sanarwa',
    'nav.userManagement': 'Sarrafa masu amfani',

    'nav.settings': 'Saiti',
    'settings.language': 'Harshe',
    'settings.branding': 'Alamar tsarin',
    'admin.panel': 'Panel na gudanarwa',
    'page.registrations.title': 'Sarrafa rajista',
    'page.registrations.description': 'Duba da sarrafa rajistan sansanin matasa',
    'page.dashboard.title': 'Dashboard',
    'page.dashboard.description': 'Bayyani na ayyukan tsarin da ƙididdiga',
    'dashboard.totalRegistrations': 'Jimlar Rajista',
    'dashboard.newThisMonth': 'Sababbi Wannan Wata',
    'dashboard.completionRate': 'Adadin Kammalawa',
    'dashboard.recentActivity': 'Ayyukan Kwanan Nan',
    'dashboard.systemStatus': 'Matsayin Tsarin',
    'dashboard.recentRegistrations': 'Rajista na Kwanan Nan',
    'dashboard.communications': 'Sadarwa',
    'dashboard.allTimeRegistrations': 'Duk rajista',
    'dashboard.recentRegistrationsText': 'Rajista na kwanan nan',
    'dashboard.successfullyCompleted': 'An kammala da nasara',
    'dashboard.last24Hours': 'Awanni 24 da suka gabata',
    'dashboard.noChange': 'Babu canji',
    'dashboard.vsLastMonth': 'da watan da ya gabata',
    'dashboard.database': 'Bayanan Ajiya',
    'dashboard.emailService': 'Sabis na Email',
    'dashboard.smsService': 'Sabis na SMS',
    'dashboard.online': 'Kan Layi',
    'dashboard.error': 'Kuskure',
    'dashboard.inactive': 'Ba ya Aiki',
    'dashboard.latestParticipantSignUps': 'Sabon rajista na mahalarta',
    'dashboard.viewAll': 'Duba Duka',
    'dashboard.systemHealthCheckCompleted': 'An kammala binciken lafiyar tsarin',
    'dashboard.hourAgo': 'awa daya da ta gabata',
    'dashboard.hoursAgo': 'awanni {count} da suka gabata',
    'dashboard.minutesAgo': 'mintuna {count} da suka gabata',
    'dashboard.welcomeEmailsSent': 'An aika email na maraba zuwa {count} sababbin rajista',
    'dashboard.registrationConfirmationBatchProcessed': 'An sarrafa tarin tabbatar da rajista',
    'dashboard.systemNotificationDatabaseBackupCompleted': 'Sanarwar tsarin: An kammala ajiyar bayanan'
  },
  ig: {
    'common.save': 'Chekwaa',
    'common.cancel': 'Kagbuo',
    'common.edit': 'Dezie',
    'common.delete': 'Hichapụ',
    'common.loading': 'Na-ebu...',
    'common.signOut': 'Pụọ',
    'common.search': 'Chọọ',
    'common.export': 'Bupụta',
    'common.view': 'Lee',
    'common.send': 'Zipu',
    'nav.dashboard': 'Dashboard',
    'nav.registrations': 'Ndebanye aha',
    'nav.attendance': 'Nkwenye Ọbịbịa',
    'nav.communications': 'Nkwukọrịta',
    'nav.accommodations': 'Ebe obibi',
    'nav.inbox': 'Igbe ozi',
    'nav.analytics': 'Nyocha',
    'nav.reports': 'Akụkọ',
    'nav.notifications': 'Ọkwa',
    'nav.userManagement': 'Njikwa ndị ọrụ',

    'nav.settings': 'Ntọala',
    'settings.language': 'Asụsụ',
    'settings.branding': 'Akara sistemu',
    'admin.panel': 'Panel nchịkwa',
    'page.registrations.title': 'Njikwa ndebanye aha',
    'page.registrations.description': 'Lee ma jikwaa ndebanye aha ogige ndị ntorobịa',
    'page.dashboard.title': 'Dashboard',
    'page.dashboard.description': 'Nchịkọta ọrụ sistemu na ọnụọgụgụ',
    'dashboard.totalRegistrations': 'Ngụkọta Ndebanye Aha',
    'dashboard.newThisMonth': 'Ndị Ọhụrụ N\'ọnwa A',
    'dashboard.completionRate': 'Ọnụọgụgụ Mmecha',
    'dashboard.recentActivity': 'Ọrụ Nso Nso A',
    'dashboard.systemStatus': 'Ọnọdụ Sistemu',
    'dashboard.recentRegistrations': 'Ndebanye Aha Nso Nso A',
    'dashboard.communications': 'Nkwukọrịta',
    'dashboard.allTimeRegistrations': 'Ndebanye aha niile',
    'dashboard.recentRegistrationsText': 'Ndebanye aha nso nso a',
    'dashboard.successfullyCompleted': 'Emechara nke ọma',
    'dashboard.last24Hours': 'Awa 24 gara aga',
    'dashboard.noChange': 'Enweghị mgbanwe',
    'dashboard.vsLastMonth': 'na ọnwa gara aga',
    'dashboard.database': 'Nchekwa Data',
    'dashboard.emailService': 'Ọrụ Email',
    'dashboard.smsService': 'Ọrụ SMS',
    'dashboard.online': 'Na Ntanetị',
    'dashboard.error': 'Njehie',
    'dashboard.inactive': 'Anaghị Arụ Ọrụ',
    'dashboard.latestParticipantSignUps': 'Ndebanye aha ndị sonyere ọhụrụ',
    'dashboard.viewAll': 'Lee Niile',
    'dashboard.systemHealthCheckCompleted': 'Emechara nyocha ahụike sistemu',
    'dashboard.hourAgo': 'otu awa gara aga',
    'dashboard.hoursAgo': 'awa {count} gara aga',
    'dashboard.minutesAgo': 'nkeji {count} gara aga',
    'dashboard.welcomeEmailsSent': 'Ezigara email nnabata nye {count} ndị debanyere aha ọhụrụ',
    'dashboard.registrationConfirmationBatchProcessed': 'Edozila ụyọkọ nkwenye ndebanye aha',
    'dashboard.systemNotificationDatabaseBackupCompleted': 'Ọkwa sistemu: Emechara nchekwa data'
  },
  yo: {
    'common.save': 'Fi pamọ',
    'common.cancel': 'Fagilee',
    'common.edit': 'Ṣatunṣe',
    'common.delete': 'Paarẹ',
    'common.loading': 'N gbé...',
    'common.signOut': 'Jade',
    'common.search': 'Wa',
    'common.export': 'Gbe jade',
    'common.view': 'Wo',
    'common.send': 'Fi ranṣẹ',
    'nav.dashboard': 'Dashboard',
    'nav.registrations': 'Iforukọsilẹ',
    'nav.attendance': 'Ifọwọsi Wiwa',
    'nav.communications': 'Ibaraẹnisọrọ',
    'nav.accommodations': 'Ibugbe',
    'nav.inbox': 'Apoti iwe',
    'nav.analytics': 'Itupalẹ',
    'nav.reports': 'Awọn ijabọ',
    'nav.notifications': 'Awọn iwifun',
    'nav.userManagement': 'Iṣakoso awọn olumulo',

    'nav.settings': 'Eto',
    'settings.language': 'Ede',
    'settings.branding': 'Ami eto',
    'admin.panel': 'Panel iṣakoso',
    'page.registrations.title': 'Iṣakoso iforukọsilẹ',
    'page.registrations.description': 'Wo ati ṣakoso iforukọsilẹ ibudó ọdọ',
    'page.dashboard.title': 'Dashboard',
    'page.dashboard.description': 'Akopọ iṣẹ eto ati awọn iṣiro',
    'dashboard.totalRegistrations': 'Lapapọ Iforukọsilẹ',
    'dashboard.newThisMonth': 'Tuntun Ni Oṣu Yi',
    'dashboard.completionRate': 'Oṣuwọn Ipari',
    'dashboard.recentActivity': 'Iṣẹ Aipẹ',
    'dashboard.systemStatus': 'Ipo Eto',
    'dashboard.recentRegistrations': 'Iforukọsilẹ Aipẹ',
    'dashboard.communications': 'Ibaraẹnisọrọ',
    'dashboard.allTimeRegistrations': 'Gbogbo iforukọsilẹ',
    'dashboard.recentRegistrationsText': 'Iforukọsilẹ aipẹ',
    'dashboard.successfullyCompleted': 'Ti pari ni aṣeyọri',
    'dashboard.last24Hours': 'Wakati 24 to kọja',
    'dashboard.noChange': 'Ko si iyipada',
    'dashboard.vsLastMonth': 'pẹlu oṣu to kọja',
    'dashboard.database': 'Ibi Ipamọ Data',
    'dashboard.emailService': 'Iṣẹ Email',
    'dashboard.smsService': 'Iṣẹ SMS',
    'dashboard.online': 'Lori Ayelujara',
    'dashboard.error': 'Aṣiṣe',
    'dashboard.inactive': 'Ko ṣiṣẹ',
    'dashboard.latestParticipantSignUps': 'Iforukọsilẹ olukopa tuntun',
    'dashboard.viewAll': 'Wo Gbogbo',
    'dashboard.systemHealthCheckCompleted': 'Ayẹwo ilera eto ti pari',
    'dashboard.hourAgo': 'wakati kan sẹhin',
    'dashboard.hoursAgo': 'wakati {count} sẹhin',
    'dashboard.minutesAgo': 'iṣẹju {count} sẹhin',
    'dashboard.welcomeEmailsSent': 'Email ikabọ fi ranṣẹ si {count} olukopa tuntun',
    'dashboard.registrationConfirmationBatchProcessed': 'Ṣiṣe akojọpọ ijẹrisi iforukọsilẹ',
    'dashboard.systemNotificationDatabaseBackupCompleted': 'Iwifun eto: Afẹyinti data ti pari'
  }
}

class LightweightI18n {
  private currentLang: Language = 'en'

  constructor() {
    // Don't load language in constructor to avoid SSR issues
    // Language will be loaded when first accessed on client
  }

  private loadLanguage(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as Language
      if (stored && this.isValidLang(stored)) {
        this.currentLang = stored
      } else {
        // Detect browser language
        const browserLang = navigator.language.split('-')[0]
        if (this.isValidLang(browserLang)) {
          this.currentLang = browserLang as Language
        }
      }
    }
  }

  private isValidLang(lang: string): boolean {
    return ['en', 'fr', 'es', 'ha', 'ig', 'yo'].includes(lang)
  }

  setLanguage(lang: Language): void {
    if (this.isValidLang(lang)) {
      this.currentLang = lang
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, lang)
        window.dispatchEvent(new CustomEvent('langChange', { detail: lang }))
      }
    }
  }

  getCurrentLanguage(): Language {
    // Load language on first access if not already loaded
    if (this.currentLang === 'en' && typeof window !== 'undefined') {
      this.loadLanguage()
    }
    return this.currentLang
  }

  translate(key: string, params?: Record<string, string | number>): string {
    let translation = coreTranslations[this.currentLang]?.[key] ||
                     coreTranslations.en[key] ||
                     key

    // Handle string interpolation
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        translation = translation.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value))
      })
    }

    return translation
  }

  getLanguages() {
    return [
      { code: 'en' as Language, name: 'English', native: 'English' },
      { code: 'fr' as Language, name: 'French', native: 'Français' },
      { code: 'es' as Language, name: 'Spanish', native: 'Español' },
      { code: 'ha' as Language, name: 'Hausa', native: 'Hausa' },
      { code: 'ig' as Language, name: 'Igbo', native: 'Igbo' },
      { code: 'yo' as Language, name: 'Yoruba', native: 'Yorùbá' }
    ]
  }
}

// Singleton instance
export const i18n = new LightweightI18n()

// Convenience functions
export const t = (key: string, params?: Record<string, string | number>): string => i18n.translate(key, params)
export const setLanguage = (lang: Language): void => i18n.setLanguage(lang)
export const getCurrentLanguage = (): Language => i18n.getCurrentLanguage()
export const getLanguages = () => i18n.getLanguages()
