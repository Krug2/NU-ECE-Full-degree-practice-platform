export function downloadProgressText(text:string,kind="progress"){
  const url=URL.createObjectURL(new Blob([text],{type:"application/json"})),link=document.createElement("a");
  link.href=url;link.download="ece-study-"+kind+"-"+new Date().toISOString().slice(0,10)+".json";
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
