// Admin users and the permissions matrix. English mirror of he/admins.js.
export default {
    title: 'Admin users',
    sub: '{n} admin users · all hold the same full permissions',

    gate: {
        title: 'Admin-user management is locked',
        why: 'This screen creates and deletes the accounts that can reach everything in the console, so entering it is a re-confirmation rather than a navigation.',
        unlock: 'Open the screen',
        scope: 'Stays open until you leave the page or lock it again',
        confirmTitle: 'Open admin-user management',
        confirmBody: 'The screen opens for viewing and editing admin accounts.',
        confirm: 'Open screen',
        effect1: 'Stays open until you leave the page or lock it again',
        effect2: 'Entering the screen is written to the system log',
        unlocked: 'Screen opened',
        failed: 'The approval code was wrong',
        locked: 'Screen locked again',
        lockAgain: 'Lock again',
        openNote:
            'The screen is open for viewing and editing. It stays open until you leave the page.',
    },

    permissions: {
        full: 'Full',
    },

    tab: {
        users: 'Admin users',
        matrix: 'Permissions matrix',
    },

    filter: {
        search: 'Name · email · phone',
        searchLabel: 'Search admin users',
        permissions: 'Permissions',
        roleAll: 'Role — all',
        login: 'Last sign-in',
        loginAll: 'Last sign-in — all',
        label: 'admin users',
    },

    bucket: {
        today: 'Signed in today',
        yesterday: 'Signed in yesterday',
        older: 'Has not signed in for two days',
        never: 'Never signed in',
    },

    table: {
        name: 'Name',
        email: 'Email',
        phone: 'Phone',
        permissions: 'Permissions',
        created: 'Created',
        lastLogin: 'Last sign-in',
        you: 'Your account',
        never: 'Never signed in',
        selfLocked:
            'The account you are signed in with cannot be changed or deleted',
    },

    action: {
        add: 'New admin user',
        resetPassword: 'Reset password',
        remove: 'Delete',
    },

    legacyNote:
        'Users created before roles existed hold the full role. Changing a role here narrows their permissions immediately.',

    editor: {
        title: 'New admin user',
        name: 'Full name',
        namePh: 'First and last name',
        email: 'Email (the sign-in username)',
        emailPh: 'name@trifolium.co.il',
        phone: 'Phone',
        phonePh: '052-0000000',
        role: 'Role',
        note: 'The initial password is set on the server and sent by SMS to the number entered. It is replaced on first sign-in and is never shown here.',
        next: 'Continue',
        invalid: 'A full name, a valid email and a phone number are required.',
    },

    create: {
        title: 'Create an admin user',
        body: '{name} ({email}) will be created as an admin user with the {role} role.',
        confirm: 'Create user',
        effect1: 'An initial password is sent by SMS to the number entered',
        effect2: 'The user receives the capabilities of the {role} role',
        effect3: 'The creation is written to the system log',
    },

    remove: {
        title: 'Delete an admin user',
        body: '{name} ({email}) will be deleted and will no longer be able to sign in.',
        confirm: 'Delete user',
        effect1: 'Their permissions are revoked immediately',
        effect2: 'Actions they took in the past stay in the log',
        effect3: 'The reason and who acted are written to the log',
    },

    reset: {
        title: 'Reset password',
        body: 'A new password will be set on the server and sent to {name} ({phone}).',
        confirm: 'Send a new password',
        effect1: 'The existing password is cancelled immediately',
        effect2:
            'The new password is sent by SMS and replaced on first sign-in',
        effect3: 'The action is written to the log',
    },

    toast: {
        created: 'The user was created',
        createdBody: '{name} · an initial password was sent by SMS',
        removed: 'The user was deleted',
        reset: 'A new password was sent',
        roleChanged: 'The role was updated',
        capabilityGranted: 'Capability granted',
        capabilityRevoked: 'Capability revoked',
        matrixReset: 'The matrix was restored to its defaults',
        failed: 'The change was not saved',
        failedBody: 'The request was rejected. Try again.',
    },

    empty: {
        title: 'No admin user found',
        sub: 'Clear the search or the sign-in filter',
    },
};
