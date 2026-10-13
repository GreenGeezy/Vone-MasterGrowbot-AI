export type OwnedObject={bucket_id:string;name:string};
export async function removeAccount(deps:{
  manifest:()=>Promise<OwnedObject[]>;
  removeObjects:(bucket:string,paths:string[])=>Promise<void>;
  finish:()=>Promise<void>;
}) {
  // Enumerate once; fail closed if any storage batch cannot be removed.
  const objects=await deps.manifest();
  const buckets=new Map<string,string[]>();
  for(const object of objects){const paths=buckets.get(object.bucket_id)||[];paths.push(object.name);buckets.set(object.bucket_id,paths);}
  for(const [bucket,paths] of buckets)for(let i=0;i<paths.length;i+=100)await deps.removeObjects(bucket,paths.slice(i,i+100));
  // Database and Auth deletion are one transaction. A retry can resume after storage removal.
  await deps.finish();
  return {ok:true};
}
