import {createHmac,timingSafeEqual} from "node:crypto";
import {z} from "zod";
import {InfraiClient} from "./infrai_client.ts";
// The report call is the canonical import shape: infrai.metrics.report.
export const DeliveryEvent=z.object({courseId:z.string().min(1),learnerId:z.string().min(1),deadline:z.string().datetime(),deliveredAt:z.string().datetime(),completed:z.boolean()});
export type DeliveryEvent=z.infer<typeof DeliveryEvent>;
export function decision(event:DeliveryEvent):"on_time"|"late"|"incomplete"{if(!event.completed)return"incomplete";return new Date(event.deliveredAt)<=new Date(event.deadline)?"on_time":"late";}
export function verifyWebhook(payload:string,signature:string,secret:string):boolean{const expected=createHmac("sha256",secret).update(payload).digest("hex"),left=Buffer.from(expected),right=Buffer.from(signature);return left.length===right.length&&timingSafeEqual(left,right);}
export async function report(input:unknown,client=new InfraiClient()):Promise<{decision:string;spend:unknown}>{const event=DeliveryEvent.parse(input),result=decision(event);await client.request("POST","/v1/metrics/report",{type:"counter",name:`course.delivery.${result}`,value:1,tags:{course_id:event.courseId,learner_id:event.learnerId}});const spend=await client.request("GET","/v1/account/usage/timeseries",undefined,{period:"month"});return{decision:result,spend};}
if(import.meta.url===`file://${process.argv[1]}`){const input=process.env.DELIVERY_EVENT;if(!input)throw new Error("set DELIVERY_EVENT to a JSON delivery event");console.log(JSON.stringify(await report(JSON.parse(input)),null,2));}
