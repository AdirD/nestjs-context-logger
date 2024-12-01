// import { ContextStore, runWithCtx, RequestContext } from './utils/store';

// describe( 'ContextStore', () => {
// 	test( 'getContext should return an empty object when there is no context', () => {
// 		const context = ContextStore.getContext();
// 		expect( context ).toEqual( {} );
// 	} );

// 	test( 'getContext should return a copy of the current context', () => {
// 		const initialContext: RequestContext = { correlationId: '12345' };
// 		runWithCtx( () => {
// 			const context = ContextStore.getContext();
// 			expect( context ).toEqual( initialContext );

// 			// Ensure it's a copy
// 			context.correlationId = '54321';
// 			expect( ContextStore.getContext() ).toEqual( initialContext );
// 		}, initialContext );
// 	} );

// 	test( 'updateContext should update the current context', () => {
// 		const initialContext: RequestContext = { correlationId: '12345' };
// 		runWithCtx( () => {
// 			const update = { requestId: '67890' };
// 			ContextStore.updateContext( update );

// 			const context = ContextStore.getContext();
// 			expect( context ).toEqual( { correlationId: '12345', requestId: '67890' } );
// 		}, initialContext );
// 	} );

// 	test( 'runWithCtx should run a function with the provided context and clear it afterward', () => {
// 		const newContext: RequestContext = { correlationId: '12345' };

// 		runWithCtx( ( ctx ) => {
// 			expect( ctx ).toEqual( newContext );
// 		}, newContext );

// 		const context = ContextStore.getContext();
// 		expect( context ).toEqual( {} );
// 	} );

// 	test( 'runWithCtx should allow nested context', () => {
// 		const outerContext: RequestContext = { correlationId: 'outer' };
// 		const innerContext: RequestContext = { correlationId: 'inner' };

// 		runWithCtx( ( outerCtx ) => {
// 			expect( outerCtx ).toEqual( outerContext );

// 			runWithCtx( ( innerCtx ) => {
// 				expect( innerCtx ).toEqual( innerContext );
// 				expect( ContextStore.getContext() ).toEqual( innerContext );
// 			}, innerContext );
// 			expect( ContextStore.getContext() ).toEqual( outerContext );
// 		}, outerContext );

// 		const context = ContextStore.getContext();
// 		expect( context ).toEqual( {} );
// 	} );
// } );
