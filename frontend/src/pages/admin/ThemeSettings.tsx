/**
 * ═══════════════════════════════════════════════════════════════
 * TEMA SOZLAMALARI SAHIFASI / THEME SETTINGS PAGE
 * Admin panel uchun dizayn sozlash sahifasi
 * Design configuration page for admin panel
 * ═══════════════════════════════════════════════════════════════
 */

import { Card, Row, Col, Typography, Space, Divider } from 'antd';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import { BgColorsOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function ThemeSettings() {
  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Sarlavha */}
        <div>
          <Title level={2}>
            <BgColorsOutlined /> Dizayn Sozlamalari
          </Title>
          <Text type="secondary">
            Ilovaning ranglarini va dizaynini bir joydan boshqaring
          </Text>
        </div>

        <Row gutter={[24, 24]}>
          {/* Tema o'zgartirish */}
          <Col xs={24} lg={12}>
            <ThemeSwitcher />
          </Col>

          {/* Qo'llanma */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <InfoCircleOutlined />
                  <span>Qanday Ishlatish</span>
                </Space>
              }
            >
              <Space direction="vertical" size="middle">
                <div>
                  <Text strong>1. Tayyor Mavzulardan Tanlash</Text>
                  <Paragraph type="secondary" style={{ marginTop: 8 }}>
                    Yuqoridagi ro'yxatdan tayyor dizayn mavzularidan birini tanlang. 
                    O'zgarishlar darhol qo'llaniladi.
                  </Paragraph>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                <div>
                  <Text strong>2. Maxsus Rang Tanlash</Text>
                  <Paragraph type="secondary" style={{ marginTop: 8 }}>
                    Rang tanlash vositasidan o'zingizga yoqqan rangni tanlang. 
                    Tizim avtomatik ravishda mos keladigan ranglarni yaratadi.
                  </Paragraph>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                <div>
                  <Text strong>3. Kod Orqali O'zgartirish</Text>
                  <Paragraph type="secondary" style={{ marginTop: 8 }}>
                    Dasturchilar uchun: <code>frontend/src/styles/theme-config.css</code> 
                    faylida barcha sozlamalarni topishingiz mumkin.
                  </Paragraph>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                <div>
                  <Text strong>Mavjud Mavzular:</Text>
                  <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                    <li>Professional White - Toza oq dizayn</li>
                    <li>Modern Dark - Zamonaviy qora</li>
                    <li>Ocean Blue - Okean ko'k</li>
                    <li>Sunset Orange - To'q sariq</li>
                    <li>Forest Green - Yashil</li>
                    <li>Royal Purple - Binafsha</li>
                    <li>Rose Pink - Pushti</li>
                    <li>Minimal Gray - Kulrang</li>
                  </ul>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Qo'shimcha ma'lumot */}
        <Card>
          <Title level={4}>Fayllar Joylashuvi</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>Asosiy konfiguratsiya:</Text>
              <Paragraph code style={{ marginTop: 4 }}>
                frontend/src/styles/theme-config.css
              </Paragraph>
              <Text type="secondary">
                Bu yerda barcha ranglar, shriftlar va oraliqlar mavjud
              </Text>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Text strong>Tayyor mavzular:</Text>
              <Paragraph code style={{ marginTop: 4 }}>
                frontend/src/styles/theme-presets.css
              </Paragraph>
              <Text type="secondary">
                8 ta tayyor dizayn mavzusi
              </Text>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Text strong>TypeScript utilities:</Text>
              <Paragraph code style={{ marginTop: 4 }}>
                frontend/src/utils/themeManager.ts
              </Paragraph>
              <Text type="secondary">
                Tema bilan ishlash funksiyalari
              </Text>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Text strong>To'liq hujjat:</Text>
              <Paragraph code style={{ marginTop: 4 }}>
                THEME_DOCUMENTATION.md
              </Paragraph>
              <Text type="secondary">
                Batafsil qo'llanma va misollar (Loyiha ildiz papkasida)
              </Text>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
