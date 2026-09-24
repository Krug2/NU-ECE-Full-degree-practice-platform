"use client";

import { useState } from "react";

export function useStudyDraft(stored:string,scope:string){
  const [draft,setDraft]=useState({value:stored,stored,scope,changed:false});
  if(draft.scope!==scope)setDraft({value:stored,stored,scope,changed:false});
  else if(draft.stored!==stored){
    const edited=draft.value!==draft.stored;
    setDraft({stored,scope,value:edited?draft.value:stored,changed:edited&&draft.value!==stored});
  }
  return {
    value:draft.value,
    changed:draft.changed,
    setValue:(value:string)=>setDraft(current=>({...current,value,changed:current.changed&&value!==current.stored})),
    loadSaved:()=>setDraft({value:stored,stored,scope,changed:false}),
  };
}
