// import { ContextLogger } from '@logger';
// import { ContextStore } from './store/context-store';

// jest.unmock( `${ process.cwd() }/src/context/context-logger.ts` );

// describe( 'ContextLogger', () => {
// 	const spyLog = jest.fn();
// 	const spyDebug = jest.fn();
// 	const spyWarn = jest.fn();
// 	const spyError = jest.fn();
// 	const MODULE_NAME = 'TestModule';
// 	const contextLogger = new ContextLogger( MODULE_NAME );
// 	const CONTEXT = { someContextField: 'someContextValue' };

// 	// @ts-expect-error - no need for exact object
// 	jest.spyOn( ContextStore, 'getContext' ).mockReturnValue( CONTEXT );
// 	const mockLogger = {
// 		log: spyLog,
// 		debug: spyDebug,
// 		warn: spyWarn,
// 		error: spyError,
// 	} as any;
// 	ContextLogger.init( mockLogger );

// 	afterEach( () => {
// 		jest.clearAllMocks();
// 	} );

// 	describe( 'log method', () => {
// 		it( 'should call internal logger with "log" level', () => {
// 			const message = 'Test message';
// 			const bindings = { someBinding: 'value' };

// 			contextLogger.log( message, bindings );

// 			expect( mockLogger.log ).toHaveBeenCalledWith(
// 				{ ...bindings, ...CONTEXT },
// 				message,
// 				MODULE_NAME
// 			);
// 		} );
// 	} );

// 	describe( 'log, debug, warn methods', () => {
// 		it.each( [ 'log', 'debug', 'warn' ] )( 'should call internal logger with "%s" level', ( method ) => {
// 			const message = 'Test message';
// 			const bindings = { someBinding: 'value' };

// 			contextLogger[ method ]( message, bindings );

// 			expect( mockLogger[ method ] ).toHaveBeenCalledWith( { ...bindings, ...CONTEXT }, message, MODULE_NAME );
// 		} );

// 		it( 'should call internal logger with empty bindings if not provided', () => {
// 			const message = 'Test message';

// 			contextLogger.log( message );

// 			expect( mockLogger.log ).toHaveBeenCalledWith( CONTEXT, message, MODULE_NAME );
// 		} );
// 	} );

// 	describe( 'error method', () => {
// 		it( 'should call internal logger with error message only', () => {
// 			const message = 'Error message';

// 			contextLogger.error( message );

// 			expect( mockLogger.error ).toHaveBeenCalledWith( CONTEXT, message, MODULE_NAME );
// 		} );

// 		it( 'should call internal logger with error message and Error object', () => {
// 			const message = 'Error message';
// 			const error = new Error( 'Test error' );

// 			contextLogger.error( message, error );

// 			expect( mockLogger.error ).toHaveBeenCalledWith( { err: error, ...CONTEXT }, message, MODULE_NAME );
// 		} );

// 		it( 'should call internal logger with error message and bindings', () => {
// 			const message = 'Error message';
// 			const bindings = { someBinding: 'value' };

// 			contextLogger.error( message, bindings );

// 			expect( mockLogger.error ).toHaveBeenCalledWith( { ...bindings, ...CONTEXT }, message, MODULE_NAME );
// 		} );

// 		it( 'should call internal logger with error message, Error object, and bindings', () => {
// 			const message = 'Error message';
// 			const error = new Error( 'Test error' );
// 			const bindings = { someBinding: 'value' };

// 			contextLogger.error( message, error, bindings );

// 			expect( mockLogger.error ).toHaveBeenCalledWith( { err: error, ...bindings, ...CONTEXT }, message, MODULE_NAME );
// 		} );

// 		it( 'should call internal logger when both error and bindings are undefined', () => {
// 			const message = 'Error message';

// 			contextLogger.error( message, undefined, undefined );

// 			expect( mockLogger.error ).toHaveBeenCalledWith( CONTEXT, message, MODULE_NAME );
// 		} );

// 		it( 'should call internal logger with message when error and bindings are null', () => {
// 			const message = 'Error message';

// 			contextLogger.error( message, null, null );

// 			expect( mockLogger.error ).toHaveBeenCalledWith( CONTEXT, message, MODULE_NAME );
// 		} );

// 		it( 'should handle unexpected types gracefully for errorOrBindings parameter', () => {
// 			const message = 'Error message';

// 			// @ts-expect-error - simulating unexpected type to see if the function handles it correctly
// 			contextLogger.error( message, 123 );

// 			expect( mockLogger.error ).toHaveBeenCalledWith( CONTEXT, message, MODULE_NAME );
// 		} );
// 	} );

// 	describe( 'init method', () => {
// 		it( 'should initialize the internal logger only once', () => {
// 			const newLogger = { log: jest.fn() } as any;
// 			ContextLogger.init( newLogger );

// 			contextLogger.log( 'Test message' );

// 			expect( mockLogger.log ).toHaveBeenCalled();
// 			expect( newLogger.log ).not.toHaveBeenCalled();
// 		} );

// 		it( 'should have different module names but still reach the same internal logger', () => {
// 			const MODULE_NAME_1 = 'TestModule1';
// 			const MODULE_NAME_2 = 'TestModule2';

// 			const contextLogger1 = new ContextLogger( MODULE_NAME_1 );
// 			const contextLogger2 = new ContextLogger( MODULE_NAME_2 );

// 			// Call the log method on both instances
// 			contextLogger1.log( 'test message 1' );
// 			contextLogger2.log( 'test message 2' );

// 			// Check that the internal logger was called with the correct module names
// 			expect( spyLog ).toHaveBeenCalledWith(
// 				expect.objectContaining( { someContextField: 'someContextValue' } ),
// 				'test message 1',
// 				MODULE_NAME_1
// 			);
// 			expect( spyLog ).toHaveBeenCalledWith(
// 				expect.objectContaining( { someContextField: 'someContextValue' } ),
// 				'test message 2',
// 				MODULE_NAME_2
// 			);
// 		} );
// 	} );
// } );
