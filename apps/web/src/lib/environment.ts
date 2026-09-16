// Shared with the serverless API, which runs as CommonJS and therefore cannot
// import from src/ at runtime. The implementation lives in api/_lib/environment.ts.
export * from '../../api/_lib/environment'
