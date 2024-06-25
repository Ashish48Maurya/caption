import { NextResponse } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const client = new S3Client({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AccessKey,
        secretAccessKey: process.env.SecretKey
    }
});

export async function POST(req) {
    const formData = await req.formData();
    const file = formData.get('file')
    const data = await file.arrayBuffer()
    if (!data) {
        return NextResponse.json({ success: false, message: "File Req" }, { status: 404 })
    }
    const type = file.type

    const command = new PutObjectCommand({
        Bucket: process.env.BucketName,
        Key: file.name,
        Body: data,
        ContentType: type
    });

    try {
        const response = await client.send(command);
        return NextResponse.json({ success: true, message: "File Uploaded" }, { status: 200 })
    } catch (err) {
        return NextResponse.json({ success: false, message: `Internal Server Error: ${err.message}` }, { status: 500 })
    }
};
