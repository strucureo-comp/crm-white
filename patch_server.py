import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('13.235.149.242', username='crm_white', password='Qwerty@123', timeout=10)

command = """
sed -i 's|const data = JSON.stringify(record);|const data = JSON.stringify(record); console.log("DB URL IS: ", dbUrl);|g' ~/crm-white/server/index.js
source ~/.nvm/nvm.sh
pm2 restart bridgebreak-backend
"""
stdin, stdout, stderr = client.exec_command(command)
print("STDOUT:", stdout.read().decode().strip())
client.close()
