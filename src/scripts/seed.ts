import { PrismaClient, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function generateApiKey(): Promise<string> {
  return randomBytes(32).toString('hex');
}

async function hashApiKey(apiKey: string): Promise<string> {
  return argon2.hash(apiKey);
}

async function createApiKey(name: string, scopes: string[]): Promise<void> {
  const apiKey = await generateApiKey();
  const keyHash = await hashApiKey(apiKey);

  await prisma.apiKey.create({
    data: {
      name,
      keyHash,
      scopes: scopes as any,
    },
  });

  console.log(`✅ Created API key for "${name}"`);
  console.log(`   Key: ${apiKey}`);
  console.log(`   Scopes: ${scopes.join(', ')}`);
  console.log('');
}

async function seedDatabase(): Promise<void> {
  console.log('🌱 Seeding database...\n');

  try {
    // Create default API keys for different scopes
    await createApiKey('Topic Notifications', ['topic']);
    await createApiKey('Personal Notifications', ['personal']);
    await createApiKey('Admin Access', ['topic', 'personal', 'admin']);
    await createApiKey('Full Access', ['topic', 'personal', 'admin']);

    // Create a sample user (optional)
    const user = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
      },
    });

    console.log('✅ Created sample user:', user.email);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Save the generated API keys securely');
    console.log(
      '2. Use these keys in your API requests with header: X-API-Key',
    );
    console.log('3. Start the application: npm run start:dev');
    console.log('4. Access Swagger UI at: http://localhost:4000/swagger');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();
