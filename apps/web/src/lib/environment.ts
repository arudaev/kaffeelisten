// Shared with the serverless API, which runs as CommonJS and therefore cannot
// import from src/ at runtime. The implementation lives in shared/environment.ts.
export * from '../../shared/environment'
