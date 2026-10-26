import test from "node:test";import assert from "node:assert/strict";import {decision,DeliveryEvent} from "./report_service.ts";
test("late completed delivery is reported as late",()=>{const event=DeliveryEvent.parse({courseId:"algebra-101",learnerId:"learner-7",deadline:"2026-10-20T09:00:00.000Z",deliveredAt:"2026-10-20T09:05:00.000Z",completed:true});assert.equal(decision(event),"late");});
