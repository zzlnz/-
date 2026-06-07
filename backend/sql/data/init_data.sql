USE house_rental;

INSERT INTO sys_user (username, password, real_name, phone, role, status) VALUES
('admin', '123456', '系统管理员', '13800000000', 'admin', 1),
('tenant1', '123456', '张三', '13800000001', 'tenant', 1);

INSERT INTO house (house_title, house_address, house_area, house_price, house_type, house_floor, house_direction, house_status, house_desc, owner_id) VALUES
('市中心精装两居', '北京市海淀区中关村大街1号', 89.50, 5200.00, '两居室', '8/18', '南北通透', 'vacant', '交通便利，配套齐全，适合家庭居住。', 1),
('地铁口单间公寓', '北京市朝阳区望京东路8号', 35.00, 2800.00, '单间', '5/12', '朝南', 'vacant', '近地铁，生活便利，适合单人居住。', 1);
