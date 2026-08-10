import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('13.235.149.242', username='crm_white', password='Qwerty@123', timeout=10)

command = "source ~/.nvm/nvm.sh && pm2 jlist"
stdin, stdout, stderr = client.exec_command(command)
out = stdout.read().decode().strip()
data = json.loads(out)
if data:
    env = data[0].get('pm2_env', {})
    for k, v in env.items():
        if 'FIREBASE' in k:
            print(f"{k}={v}")

client.close()
