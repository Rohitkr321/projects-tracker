require('dotenv').config();
const { sequelize, Organization, User } = require('./src/models');

const USERS = [
  {
    firstName: 'Admin',
    lastName: 'Supervisor',
    email: 'admin@generalaeronautics.com',
    password: 'Admin@1234',
    role: 'org_admin',
  },
  {
    firstName: 'Project',
    lastName: 'Manager',
    email: 'pm@generalaeronautics.com',
    password: 'Test@1234',
    role: 'project_manager',
  },
  {
    firstName: 'Dev',
    lastName: 'User',
    email: 'dev@generalaeronautics.com',
    password: 'Test@1234',
    role: 'developer',
  },
  {
    firstName: 'Reporter',
    lastName: 'User',
    email: 'reporter@generalaeronautics.com',
    password: 'Test@1234',
    role: 'reporter',
  },
];

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Connected to database\n');

    // Create or find the organisation
    const [org, orgCreated] = await Organization.findOrCreate({
      where: { name: 'General Aeronautics' },
      defaults: {
        name: 'General Aeronautics',
        slug: 'general-aeronautics',
        description: 'General Aeronautics internal project tracker',
        industry: 'Aerospace',
        timezone: 'UTC',
      },
    });
    console.log(`${orgCreated ? '✓ Created' : '→ Already exists'} org: ${org.name}  (id: ${org.id})\n`);

    // Create users (password hashing runs via beforeCreate hook)
    for (const data of USERS) {
      const [user, created] = await User.findOrCreate({
        where: { email: data.email },
        defaults: { ...data, organizationId: org.id, isEmailVerified: true },
      });
      console.log(`${created ? '✓ Created' : '→ Already exists'} [${user.role.padEnd(15)}]  ${user.email}`);
    }

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║              TEST LOGIN CREDENTIALS                  ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║ Role             Email                    Password   ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║ org_admin        admin@generalaeronautics.com        ║');
    console.log('║   (Supervisor)   Password: Admin@1234                ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║ project_manager  pm@generalaeronautics.com           ║');
    console.log('║                  Password: Test@1234                 ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║ developer        dev@generalaeronautics.com          ║');
    console.log('║                  Password: Test@1234                 ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║ reporter         reporter@generalaeronautics.com     ║');
    console.log('║                  Password: Test@1234                 ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

  } catch (err) {
    console.error('\n✗ Seed failed:', err.message);
    if (err.original) console.error('  DB error:', err.original.sqlMessage || err.original.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

seed();
