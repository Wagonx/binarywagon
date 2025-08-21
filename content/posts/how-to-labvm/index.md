---
title: "Creating and Configuring a Basic Lab VM"
date: 2025-07-25T12:36:48-05:00
draft: false
toc: false
images:
tags: 
  - windows
  - vmware-workstation
  - virtualazation
  - guide
---

#### Who is this for?

This guide will cover creating a Windows VM, configuring the hypervisor, and setting up FlareVM. The goal is that by the end of this post, you will have a simple, but effective, place to start fundamental malware analysis. This VM is primarily intended for use in CTFs or educational challenges. We will not be performing the necessary configuration on the network to make this suitable for real-world samples. Additionally, if you are reading this guide, you are not ready to work with any real samples quite yet. 


# Section 1 - Creating the Virtual Machine

## 1.1 - Choosing your ISO

For my example, I will be using a Windows 11 23H3 ISO If you need help getting your own, check out my other post where I detail the process of doing so. I am also going to use a tool called [Tiny11](https://github.com/ntdevlabs/tiny11builder). Tiny11 is a script that will help optimize my ISO by reducing its size before I create the virtual machine. This will be useful for keeping our resource usage down on the hypervisor host and allowing me to have more VMs running simultaneously. Tiny11 removes some built-in Windows features and can occasionally cause strange issues, especially with the Tiny11Core version. If it does become an issue, doing it without is totally fine. For now, make sure, before moving one, you have completed the following: 

- Obtained a copy of Win11
- (Optional) Created your Tiny ISO with Tiny11

## 1.2 Picking your Hypervisor

There are a multitude of both Type 1 (e.g, Proxmox) and Type 2 (e.g, VirtualBox) hypervisors to choose from. I will be demonstrating using VMware Workstation Pro, my Type 2 hypervisor of choice. You can pick whatever, though. The steps are similar. If you are still new, I would not recommend setting up a Type 1 Hypervisor just for this, though. Below are a few options I recommend for Type 2:  

### Windows HyperVisors
- [VirtualBox](https://www.virtualbox.org/) (Free)
- [VMWare Workstation/Fusion](https://www.vmware.com/products/desktop-hypervisor/workstation-and-fusion) (Free)
- [HyperV](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/overview?pivots=windows) (Built into Windows 10/11 and Server)
### Linux Hypervisors
- [virt-manager](https://virt-manager.org/) with KVM/QEMU
- [VirtualBox](https://www.virtualbox.org/) (Free)

## 1.3 Creating the VM and installing the OS

I will walk thorough this, step by step, Google is your friend if you are not using VMWare. 

1. Create new a new VM in your hypervisor
2. Create the VM, make sure you enable the necessary setting for TPM to work, you can bypass this if you want, a quick google search will show you how.
3. (VMWare Only) add `managedVM.autoAddVTPM = "software"` to the virtual machines `.vmx` file
4. Boot the VM and run through the windows out of box experince.(This part gets skipped with Tiny11)
5. To setup Win11 with a local account, after windows boots to the OOBE, press `SHIFT+F10` and enter the below command:
    - `start ms-cxh:localonly`
6. Once setup is completed, congrats! You are done with Section 1. 

# Section 2 - Configuring your VM

*These analysis VMs are meant to be your first steps into the field. They are designed for CTFs and learning environments - we will not be covering all the precautions necessary to use these for analysis of real malware samples. While they would likely be fine for basic analysis, I would not recommend using them for actual threat samples without additional hardening and isolation measures. If you are intrested in those measure, I will have a blog covering it soon*

## 2.1 Windows

When configuring our VMs, we want to take a few things into consideration for malware analysis environments. First, we'll want to disable a couple of Windows features that may make debugging harder - one of those features is Windows Defender. When we are doing malware analysis in controlled lab environments, we want our samples to execute on our terms and not be stopped or interacted with by Defender. We will be disabling all of the real-time monitoring and the service as a whole. We are also going to disable ASLR and DEP. ASLR (Address Space Layout Randomization) works by randomizing the memory addresses of programs each time they are loaded into memory. This usually would make it more difficult for an attacker to exploit a buffer overflow attack, but again, for analysis purposes we want things to execute as they were originally designed. DEP is a bit more in-depth, but you can read more [about it here](https://heimdalsecurity.com/blog/dep-data-execution-prevention-windows/). Along with Defender, we will be disabling all of the Windows Update services as well. This is to keep our environments as static as possible - also, it prevents unnecessary resource consumption during analysis.

Below is a script that will do all of the above for you. Make sure to run it as an administrator. Also, do not run this outside of a VM environment - it is built to be thorough in disabling these security features, and if you don't know what you're doing, turning these services back on can be quite tedious.

```powershell

# Lab VM Security Disable Script
# WARNING: This script disables critical security features. Use only on isolated analysis VMs.
# Run as Administrator

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    throw "This script must be run as Administrator!"
}

# Disable Windows Defender comprehensive
Set-MpPreference -DisableRealtimeMonitoring $true -DisableBehaviorMonitoring $true -DisableBlockAtFirstSeen $true -DisableIOAVProtection $true -DisablePrivacyMode $true -SignatureDisableUpdateOnStartupWithoutEngine $true -DisableArchiveScanning $true -DisableIntrusionPreventionSystem $true -DisableScriptScanning $true -ErrorAction SilentlyContinue

# Registry disable (persistent)
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender" /v DisableAntiSpyware /t REG_DWORD /d 1 /f 2>$null

# Stop and disable service
Stop-Service WinDefend -Force -ErrorAction SilentlyContinue
Set-Service WinDefend -StartupType Disabled -ErrorAction SilentlyContinue

# Disable ASLR system-wide
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" /v MoveImages /t REG_DWORD /d 0 /f 2>$null

# Disable DEP
bcdedit /set nx AlwaysOff 2>$null

# Disable Control Flow Guard
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" /v MitigationOptions /t REG_BINARY /d 000000000000000000000000000000000000000000000000 /f 2>$null

# Disable Windows Update service
Stop-Service wuauserv -Force -ErrorAction SilentlyContinue
Set-Service wuauserv -StartupType Disabled -ErrorAction SilentlyContinue

# Registry settings to disable updates
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" /v NoAutoUpdate /t REG_DWORD /d 1 /f 2>$null
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" /v AUOptions /t REG_DWORD /d 1 /f 2>$null
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update" /v AUOptions /t REG_DWORD /d 1 /f 2>$null
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" /v DisableWindowsUpdateAccess /t REG_DWORD /d 1 /f 2>$null
```
## 2.2 Installing FlareVM

This step is recommended, but it can be skipped if desired. Here we will be using a tool called FlareVM to help us install and maintain a consistent set of tools for our future analysis.

The repository can be [found here;](https://github.com/mandiant/flare-vm) they also provide detailed instructions for installation. They also include some helpful links that provide instructions for disabling many of the services we discussed earlier.

Before installing, take a VM snapshot so you can revert if you mess up.

Perform the installation and select all the default options. As you become more familiar with this work, you will develop a sense of what other software packages you may need or want to have included. The only thing I am adding is Chrome, because my Tiny11 ISO comes with zero Windows packages, including Edge.

## 2.3 Hypervisor

Once you have finished setting up all the tools you might want, we will move our VM to host-only networking or NAT. We do not want it to have access to our normal subnets or the internet. The other option is to configure isolated VLANs/subnets for these machines to operate on; however, I will not cover that here.

If you are using VMware Workstation or VirtualBox, disable "drag and drop" and clipboard sharing - these are often the easiest vectors for VM escape vulnerabilities.

Finally, we want to take a snapshot of our base state. This will be what we revert to after we are done or need a clean VM state. If you are using VMware Workstation, I recommend setting this VM up as a template and copying it. I often work on multiple projects at once, and I limit one sample per VM for manual analysis.

# Wrapping Up

We are done - this VM will be all you need for fundamental analysis in CTFs or challenges on sites like HackTheBox and CyberDefenders. Again, these are not set up for real samples. I will, however, have a post soon that outlines some of the steps to set up an environment for that.
