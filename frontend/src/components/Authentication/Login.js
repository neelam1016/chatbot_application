import React, { useState } from "react";
import { FormControl, FormLabel, Input, InputGroup, VStack, InputRightElement, Button, useToast } from "@chakra-ui/react";
import axios from "axios";
import { useHistory } from "react-router-dom";
// import { ChatState } from "../../Context/ChatProvider";

export const Login = () => {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState();
  const [loading, setLoading] = useState(false)
  const toast = useToast();


  const history = useHistory();
  // const { setUser } = ChatState();

  const submitHandler = async () => {
    setLoading(true);
    if (!email || !password) {
      toast({
        title: "Please Fill all the Feilds",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
      return;
    }
    const config = {
      headers: {
        "Content-type": "application/json"
      }
    }


    axios.post(`${process.env.REACT_APP_API_URL}/api/user/login`, { email, password }, config)
      .then((res) => {
        localStorage.setItem("userInfo", JSON.stringify(res.data));
        // setUser(res.data);
        toast({
          title: "Login succesfully",
          status: "success",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
        setLoading(false);
        history.push("/chats");
      })
      .catch((err) => {
        console.log("message:", err);
        toast({
          title: err.response.data.message || "Error Occured",
          status: "warning",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
        setLoading(false);
      })

  };
  const handleClick = () => setShow(!show);

  return (
    <VStack spacing="5px" color="black">
      <FormControl id="email" isRequired>
        <FormLabel>Email</FormLabel>
        <Input
          placeholder="Enter Your Email"
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          value={email}
        ></Input>
      </FormControl>
      <FormControl id="password" isRequired>
        <FormLabel>Password</FormLabel>
        <InputGroup>
          <Input
            type={show ? "text" : "password"}
            placeholder="Enter Your Password"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
          <InputRightElement width="4.5rem">
            <Button h="1.75rem" size="sm" onClick={handleClick}>
              {show ? "Hide" : "Show"}
            </Button>
          </InputRightElement>
        </InputGroup>
      </FormControl>

      <Button
        colorScheme="blue"
        width="100%"
        color="white"
        style={{ marginTop: 15 }}
        isLoading={loading}
        onClick={submitHandler}
      >
        Login
      </Button>
      <Button
        variant="solid"
        colorScheme="red"
        width="100%"

        onClick={() => {
          setEmail('guest@example.com')
          setPassword("123456")
        }
        }

      >
        Get Guest User Credentials
      </Button>
    </VStack>
  );
};
