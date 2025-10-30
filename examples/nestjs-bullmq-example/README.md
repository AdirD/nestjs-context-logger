# BullMQ Example

This example demonstrates how to use `@WithContext` decorator with BullMQ async job processors.

## Setup

1. Make sure Redis is running:
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:latest
   ```

2. Install dependencies:
   ```bash
   cd examples/nestjs-bullmq-example
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run the application:
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## Usage

1. Start the application - it will listen on `http://localhost:3000`

2. Add a job to the queue:
   ```bash
   curl -X POST http://localhost:3000/add-email-job
   ```

3. Watch the logs - you should see the context information (jobId, jobName, queueName, emailRecipient) in all log messages from the processor.

## What It Demonstrates

- Using `@WithContext` decorator with BullMQ job processors
- Extracting job parameters (id, name, queueName, data) into context
- Context persists across async operations within job processing
- Context is automatically included in all log messages from the processor

## Example Output

When processing a job, you'll see logs like:
```
{
  "level": 30,
  "time": 1234567890,
  "jobId": "1",
  "jobName": "send-email",
  "queueName": "email-queue",
  "emailRecipient": "user@example.com",
  "msg": "Processing email job",
  ...
}
```

All log messages from the processor will include the job context automatically!

