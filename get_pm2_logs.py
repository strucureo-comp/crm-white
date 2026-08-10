import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('13.235.149.242', username='crm_white', password='Qwerty@123', timeout=10)

command = "source ~/.nvm/nvm.sh && pm2 logs bridgebreak-backend --lines 20 --nostream"
stdin, stdout, stderr = client.exec_command(command)
print("STDOUT:", stdout.read().decode().strip())
client.close()
