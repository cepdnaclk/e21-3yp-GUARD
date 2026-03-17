import json
import os
import paho.mqtt.client as mqtt

BROKER_HOST = os.getenv("BROKER_HOST", "localhost")
BROKER_PORT = int(os.getenv("BROKER_PORT", "1883"))
DEVICE_ID = os.getenv("DEVICE_ID", "100")
SENSOR_NAME = os.getenv("SENSOR_NAME", "temperature")
TOPIC = f"sensor/{DEVICE_ID}/{SENSOR_NAME}"


def on_connect(client, userdata, flags, rc):
    print(f"[MQTT] Connected with result code {rc}")
    client.subscribe(TOPIC, qos=1)
    print(f"[MQTT] Subscribed to {TOPIC}")


def on_message(client, userdata, msg):
    raw = msg.payload.decode()
    try:
        payload = json.loads(raw)
        print(f"[DATA] topic={msg.topic} value={payload.get('value')} time={payload.get('time')}")
    except json.JSONDecodeError:
        print(f"[DATA] topic={msg.topic} raw={raw}")


client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message
client.connect(BROKER_HOST, BROKER_PORT, 60)
client.loop_forever()