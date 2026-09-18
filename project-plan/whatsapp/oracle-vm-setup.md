# Oracle Cloud Always Free VM Setup Guide

This guide details the complete provisioning and hardening process for the **Ampere A1 VM** used to host the WhatsApp Automation microservice.

---

## 1. Prerequisites: Generate SSH Key Pair Locally

On your local machine (PowerShell):

```powershell
# Generate dedicated Ed25519 key pair
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\oracle_whatsapp_key" -C "oracle-whatsapp-vm"

# Output public key to clipboard
Get-Content "$env:USERPROFILE\.ssh\oracle_whatsapp_key.pub"
```

---

## 2. Oracle Cloud Console Provisioning

1. Log in to [Oracle Cloud Console](https://cloud.oracle.com).
2. Go to **Compute** > **Instances** > **Create Instance**.
3. **Instance Specifications**:
   - **Name**: `whatsapp-bot-vm`
   - **Image**: Ubuntu 22.04 LTS or Ubuntu 24.04 LTS
   - **Shape**: **Ampere VM.Standard.A1.Flex** (Arm-based)
   - **OCPUs**: `2`
   - **Memory**: `12 GB`
   - **Networking**: Public Subnet with Assigned Public IPv4 Address
   - **SSH Keys**: Paste public key from `oracle_whatsapp_key.pub`
   - **Boot Volume**: 50 GB – 100 GB (Always Free allows up to 200 GB total)
4. Click **Create** and wait for the instance status to turn green (**RUNNING**).

---

## 3. Network Firewall Configuration (Security List)

1. Open your VCN's **Default Security List** under Networking.
2. Under **Ingress Rules**, ensure the following rules exist:
   - **SSH**: Port `22`, TCP, CIDR `0.0.0.0/0` (or restricted to your IP).
   - **WhatsApp Service API**: Port `3001`, TCP, CIDR `0.0.0.0/0`.

---

## 4. SSH Login & OS Hardening

From your local machine:

```powershell
ssh -i "$env:USERPROFILE\.ssh\oracle_whatsapp_key" ubuntu@<YOUR_VM_PUBLIC_IP>
```

Inside the VM terminal:

```bash
# 1. Update OS packages
sudo apt update && sudo apt upgrade -y

# 2. Configure OS firewall (ufw)
sudo ufw allow 22/tcp
sudo ufw allow 3001/tcp
sudo ufw enable

# 3. Install Docker & required utilities
sudo apt install -y curl git ufw fail2ban
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# 4. Verify Docker
docker --version
```
