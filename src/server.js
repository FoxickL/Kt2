const app=require('./app');const {port,prisma}=require('./config');
prisma.$connect().then(()=>app.listen(port,()=>console.log(`KT6 API listening on ${port}`))).catch(error=>{console.error('Database connection failed:',error.message);process.exit(1);});
