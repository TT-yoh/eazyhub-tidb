import { connect } from '@tidbcloud/serverless';

async function check() {
  const connectionString = process.env.DATABASE_URL || 'mysql://3jABetW1gTRxkE7.root:88BlMhKir4EcKZHy@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/sys';
  console.log('Connecting to:', connectionString);
  const db = connect({ url: connectionString });
  
  try {
    const res = await db.execute("SHOW TABLES FROM test");
    console.log("Tables in 'test':", res);
    
    const resSys = await db.execute("SHOW TABLES FROM sys");
    console.log("Tables in 'sys':", resSys);
  } catch (err) {
    console.error(err);
  }
}
check();
