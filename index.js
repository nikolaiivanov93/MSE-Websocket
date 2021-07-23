        function msePlayer() {
            const playerInstance = function () {
                this.isPlaying = false;
                this.streamingStarted = false;
                this.ms = null;
                this.queue = [];
                this.ws = null;
                this.sourceBuffer = null;
                this.livestream = document.getElementById("livestream");
                this.suuid = "tennis90.main.360p";
                this.initialize = () => {
                    if ('MediaSource' in window) {
                        this.ms = new MediaSource();
                        this.ms.addEventListener('sourceopen', this.start(), false);
                        this.livestream.src = window.URL.createObjectURL(this.ms);
                        this.livestream.onpause = () => {
                            console.log("The video has been paused");
                            this.stop();
                        };
                        this.livestream.onplay = () => {
                            console.log("The video has been started");
                            // функция для отправки команды ping на сервер
                            function wsSendPing() {
                                this.ws.send(JSON.stringify({action: 'PING'}));
                            }
                            wsSendPing();
                            if (this.isPlaying === false) {
                                this.start();
                            }
                        };

                    } else {
                        console.error("Unsupported MSE");
                    }
                };
                this.start = () => {
                    this.isPlaying = true;
                    this.ws = new WebSocket("ws://localhost:9000", "rust-websocket");
                    this.ws.binaryType = "arraybuffer";
                    this.ws.onopen = (event) => {
                        console.log('Socket opened', event);
                        console.log('completed');
                    }
                    this.ws.onclose = (event) => {
                        console.log('Socket closed', event);
                        if (this.isPlaying === true) {
                            setTimeout(() => {
                                // this.start();
                            }, 1000);
                        }
                    }
                    this.ws.onerror = (err) => {
                        console.error('Socket encountered error: ', err.message, 'Closing socket');
                        this.ws.close();
                    };
                    this.ws.onmessage = (event) => {
                        const data = new Uint8Array(event.data);
                        console.log('Message:', event.data);
                        if (data[0] === 9) {
                            console.log('no pushPacket')
                            let decoded_arr = data.slice(1);
                            let mimeCodec;
                            if (window.TextDecoder) {
                                mimeCodec = new TextDecoder("utf-8").decode(decoded_arr);
                            } else {
                                //mimeCodec =Utf8ArrayToStr(decoded_arr);
                                mimeCodec = String.fromCharCode(decoded_arr);
                            }
                            if (this.verbose) {
                                console.log('first packet with codec data: ' + mimeCodec);
                            }
                            if (!this.sourceBuffer && this.livestream) {
                                this.sourceBuffer = this.ms.addSourceBuffer('video/mp4; codecs="' + mimeCodec + '"');
                                this.sourceBuffer.mode = "segments";
                                this.sourceBuffer.addEventListener("updateend", this.loadPacket);
                            }
                        } else {
                            console.log('pushPacket+');
                            this.pushPacket(event.data);
                        }
                    };
                    
                        // функция для отправки echo-сообщений на сервер
                        // function wsSendEcho(value) {
                        //     this.ws.send(JSON.stringify({action: 'ECHO', data: value.toString()}));
                        // }
                        
                        
                };
                this.stop = () => {
                    this.isPlaying = false;
                    if (this.ws) {
                        this.ws.close();
                        if (this.livestream && this.sourceBuffer) {
                            this.sourceBuffer.abort();
                            if (this.livestream.currentTime > 0) {
                                this.sourceBuffer.remove(0, this.livestream.currentTime);
                            }
                            this.livestream.currentTime = 0
                        }
                    }
                };
                this.pushPacket = (arr) => {
                    let view = new Uint8Array(arr);
                    console.log('push event.data:', arr);
                    if (this.verbose) {
                        console.log("got", arr.byteLength, "bytes.  Values=", view[0], view[1], view[2], view[3], view[4]);
                    }
                    let data = arr;
                    if (!this.streamingStarted && this.livestream) {
                        this.sourceBuffer.appendBuffer(data);
                        this.streamingStarted = true;
                        return;
                    }
                    this.queue.push(data);
                    if (this.verbose) {
                        console.log("queue push:", this.queue.length);
                    }
                    if (!this.sourceBuffer.updating) {
                        this.loadPacket();
                    }
                };
                this.loadPacket = () => {
                    if (!this.sourceBuffer.updating && this.livestream) {
                        if (this.queue.length > 0) {
                            let inp = this.queue.shift();
                            if (this.verbose) {
                                console.log("queue PULL:", this.queue.length);
                            }
                            let view = new Uint8Array(inp);
                            if (this.verbose) {
                                console.log("writing buffer with", view[0], view[1], view[2], view[3], view[4]);
                            }
                            this.sourceBuffer.appendBuffer(inp);
                        } else {
                            this.streamingStarted = false;
                        }
                    }
                }
                return this;
            }

            const player = playerInstance();
            player.initialize();
        }

        window.onload = () => {msePlayer()};