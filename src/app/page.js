"use client"

import { useState } from "react";

export default function Home() {
  const [file,setFile] = useState(null);

  const handleUpload = async(e)=>{
    const form = new FormData();
    form.append("file",file);
    const res = await fetch('/api/putVideo',{
      method:"POST",
      body:form
    })
    const data = await res.json()
    if(!data.ok){
      console.log(data.message);
    }
    console.log("File Uploaded",data.message);
  }


  const handleReq=async ()=>{
    const res = await fetch(`/api/getVideo?filename=${file}`,{
      method:"GET",
    })
    const data = await res.json()
    if(!data.ok){
      console.log(data.message);
    }
    console.log("Transcript: ",data.message);
  }

  return (
    <>
    <input type="file" onChange={(e)=>{setFile(e.target.files[0])}}/>
    <button onClick={handleUpload}>Upload</button>

    <button onClick={handleReq}>Transcript</button>
    </>
  );
}
