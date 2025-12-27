import React, { useEffect, useState } from "react";
import axios from 'axios';
 export const Chatpage=()=>{
    const [chats,setChats] = useState([])
   const fetchChats=async()=>{
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    const config={
      headers:{
        "Content-type":"application/json",
         Authorization: `Bearer ${userInfo.token}`
      }
    }
    const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/chats`,config);
    // setChats(data)
    console.log(res)
    console.log("chats",res.data)
   }
   useEffect(()=>{
      console.log("dhhh")
      fetchChats()
   },[])
    return(
        <>{
            chats.map(chat=><div key={chat._id}>{chat.chatName}</div>)
        }</>
    )
 }