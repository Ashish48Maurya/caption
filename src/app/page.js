"use client"
import { useEffect, useRef, useState } from "react";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import roboto from './Roboto-Regular.ttf';
import robotoBold from './Roboto-Bold.ttf';

export default function Home() {
  const [file, setFile] = useState(null);
  const [content, setContent] = useState([]);
  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  let srt = '';


  const videoURL = `https://transcribe-nodejs.s3.ap-south-1.amazonaws.com/${file?.name}`;

  const formatTime = (time) => {
    const d = new Date(parseFloat(time) * 1000);
    return d.toISOString().slice(11, 23);
  }


  const load = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd'
    const ffmpeg = ffmpegRef.current;

    console.log("Loading");
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    // await ffmpeg.writeFile('/tmp/roboto.ttf',await fetchFile(roboto))
    console.log("Loading Complete");
    setLoaded(true);
  };

  useEffect(() => {
    if (file) {
      videoRef.current.src = videoURL
      load();
    }
  }, [file]);

  const handleReq = async () => {
    const res1 = await fetch(`/api/getVideo?filename=${file.name}`, {
      method: "GET",
    })
    const data = await res1.json()
    if (!data.ok) {
      console.log(data.message);
    }
    const res = data?.message.results.items;
    // console.log("content:", res);
    const updatedRes = res.filter((item, index) => {
      if (!item.start_time && index > 0) {
        res[index - 1].alternatives[0].content += item.alternatives[0].content;
        return false;
      }
      return true;
    });
    setContent(updatedRes);

    updatedRes.forEach((item, index) => {
      const startTime = formatTime(item.start_time).replace('.', ',');
      const endTime = formatTime(item.end_time).replace('.', ',');
      const text = item.alternatives[0].content;
      srt += `${index + 1}\n${startTime} --> ${endTime}\n${text}\n\n`;
    });
  }

  const transcode = async () => {
    console.log(file?.name);
    if (!loaded) {
      console.log("FFmpeg is not loaded yet.");
      return;
    }
    await handleReq();
    const ffmpeg = ffmpegRef.current;
    await ffmpeg.writeFile(file?.name, await fetchFile(videoURL));
    await ffmpeg.writeFile('subs.srt', srt);
    ffmpeg.on("log", ({ message }) => {
      console.log(message);
    });
    await ffmpeg.exec([
      '-i', file?.name,
      '-preset', 'ultrafast',
      '-vf', `subtitles=subs.srt:fontsdir=/tmp:force_style='Fontname=Roboto Bold,FontSize=30,MarginV=70,PrimaryColour=&H00FF0000'`,
      'output.mp4',
    ]);
    const data = await ffmpeg.readFile('output.mp4');
    // console.log("VIDEO: ",URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' })));
    videoRef.current.src = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
  };


  const handleUpload = async (e) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch('/api/putVideo', {
      method: "POST",
      body: form
    });
    const data = await res.json();
    if (!data.ok) {
      console.log(data.message);
    }
    console.log("File Uploaded", data.message);
  };

  return (
    <>
      <div className=' flex justify-around mt-5'>
        <div>
          <input type="file" onChange={(e) => { setFile(e.target.files[0]) }} />
          <button onClick={handleUpload} className=' bg-blue-600 p-2 rounded-md cursor-grab'>Upload</button>
        </div>
        <div>
          <button onClick={transcode} className='bg-orange-600 cursor-grab rounded-md p-2' disabled={content.length !== 0}>ApplyCaption</button>
        </div>
      </div>
      <div className='flex flex-wrap justify-center gap-10 m-20'>
        <div>{
          content.length > 0 ? (
            <table className='border'>
              <thead>
                <tr className='p-10 text-sky-500 text-center border'>
                  <th className=' border text-center px-8'>Start_time</th>
                  <th className=' border text-center px-8'>End_time</th>
                  <th className=' border text-center px-8'>Content</th>
                </tr>
              </thead>
              <tbody className=' text-center'>
                {content.map((data, index) => (
                  <tr key={index}>
                    <td>{data.start_time}</td>
                    <td>{data.end_time}</td>
                    <td>{data.alternatives[0].content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <h1>Loading...</h1>
          )
        }</div>
        <div className='top-0'>
          <video ref={videoRef} data-video={0} controls></video>
          {/* <video src="videoplayback.mp4" controls loop></video> */}

        </div>
      </div>
    </>
  );
}
